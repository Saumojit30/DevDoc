"""
Symbol Table and Cross-File Dependency Resolver for DevDoc.
Indexes parsed AST symbols and resolves cross-file imports, call graphs,
inheritance, and containment into structured nodes and typed directional edges.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from ast_parser import FileASTResult, ParsedImport, ParsedSymbol


class SymbolTable:
    def __init__(self, dataset_name: str = "default"):
        self.dataset_name = dataset_name
        self.files: dict[str, FileASTResult] = {}
        self.symbols: dict[str, ParsedSymbol] = {}
        self.symbol_id_to_file: dict[str, str] = {}
        self.symbols_by_name: dict[str, list[str]] = {}  # name -> list of symbol_ids
        self.modules_by_name: dict[str, str] = {}  # stem / name -> file_path
        self.file_to_symbols: dict[str, list[str]] = {}  # file_path -> list of symbol_ids

        # Call tracking
        self.callers_map: dict[str, set[str]] = {}  # symbol_id -> set of caller_ids
        self.callees_map: dict[str, set[str]] = {}  # symbol_id -> set of callee_ids

    def _make_symbol_id(self, file_path: str, sym: ParsedSymbol) -> str:
        clean_path = file_path.replace("\\", "/")
        if sym.symbol_type == "module":
            return f"file://{clean_path}"
        if sym.parent:
            return f"{clean_path}::{sym.parent}.{sym.name}"
        return f"{clean_path}::{sym.name}"

    def _make_file_id(self, file_path: str) -> str:
        clean_path = file_path.replace("\\", "/")
        return f"file://{clean_path}"

    def add_file_result(self, result: FileASTResult) -> None:
        clean_path = result.file_path.replace("\\", "/")
        self.files[clean_path] = result
        self.modules_by_name[result.module_name] = clean_path
        stem = Path(clean_path).stem
        self.modules_by_name[stem] = clean_path
        self.file_to_symbols[clean_path] = []

        for sym in result.symbols:
            sym_id = self._make_symbol_id(clean_path, sym)
            self.symbols[sym_id] = sym
            self.symbol_id_to_file[sym_id] = clean_path
            self.file_to_symbols[clean_path].append(sym_id)

            if sym.name not in self.symbols_by_name:
                self.symbols_by_name[sym.name] = []
            if sym_id not in self.symbols_by_name[sym.name]:
                self.symbols_by_name[sym.name].append(sym_id)

            if sym_id not in self.callers_map:
                self.callers_map[sym_id] = set()
            if sym_id not in self.callees_map:
                self.callees_map[sym_id] = set()

    def resolve_target_file(self, current_file: str, import_item: ParsedImport) -> Optional[str]:
        raw_mod = import_item.module.replace("\\", "/")
        clean_curr = current_file.replace("\\", "/")
        curr_dir = Path(clean_curr).parent

        # 1. Check relative imports (e.g. ./utils, ../components/Button, Python relative imports)
        if import_item.is_relative or import_item.level > 0 or raw_mod.startswith("."):
            candidates_to_check: list[str] = []
            
            if import_item.level > 0:
                # Python style relative import
                parts = list(curr_dir.parts)
                steps_up = max(0, import_item.level - 1)
                if steps_up > 0 and len(parts) >= steps_up:
                    base_dir = Path(*parts[:-steps_up]) if len(parts) > steps_up else Path("")
                else:
                    base_dir = Path(*parts) if parts else Path("")
                mod_path = import_item.module.replace(".", "/") if import_item.module else ""
                target_base = str(base_dir / mod_path).replace("\\", "/").rstrip("/")
            else:
                target_base = os.path.normpath(os.path.join(str(curr_dir), raw_mod)).replace("\\", "/")

            candidate_exts = ["", ".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"]
            index_exts = [".ts", ".tsx", ".js", ".jsx", ".py"]

            for ext in candidate_exts:
                candidates_to_check.append(target_base + ext)
            for ext in index_exts:
                candidates_to_check.append(f"{target_base}/index{ext}")

            for cand in candidates_to_check:
                cand_clean = cand.lstrip("./")
                for known in self.files:
                    known_clean = known.lstrip("./")
                    if known_clean == cand_clean or known_clean.endswith("/" + cand_clean) or known == cand:
                        return known

        # 2. Check direct stem or module name match
        if raw_mod in self.modules_by_name:
            return self.modules_by_name[raw_mod]

        mod_stem = raw_mod.split("/")[-1].split(".")[-1]
        if mod_stem in self.modules_by_name:
            return self.modules_by_name[mod_stem]

        # 3. Check substring path match
        for known in self.files:
            known_clean = known.replace("\\", "/")
            if known_clean.endswith(f"/{raw_mod}.py") or known_clean.endswith(f"/{raw_mod}.ts") or known_clean.endswith(f"/{raw_mod}.tsx") or known_clean.endswith(f"/{raw_mod}.js"):
                return known
            if raw_mod.replace(".", "/") in known_clean:
                return known

        return None

    def build_graph(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Builds graph nodes and typed directional edges (DEFINES, CONTAINS, IMPORTS, CALLS, EXTENDS).
        """
        nodes: list[dict[str, Any]] = []
        edges: list[dict[str, Any]] = []
        seen_edges: set[tuple[str, str, str]] = set()

        def add_edge(src: str, tgt: str, relation: str, weight: float = 1.0, props: dict[str, Any] | None = None):
            if not src or not tgt or src == tgt:
                return
            edge_key = (src, tgt, relation)
            if edge_key in seen_edges:
                return
            seen_edges.add(edge_key)
            p = props or {}
            p["relation"] = relation
            p["dataset_name"] = self.dataset_name
            edges.append({
                "source": src,
                "target": tgt,
                "relation": relation,
                "weight": weight,
                "properties": p,
            })

        # Phase 1: 3-Tier Call Resolution Hierarchy across symbols
        for file_path, f_res in self.files.items():
            for sym in f_res.symbols:
                if sym.symbol_type == "module":
                    continue
                sym_id = self._make_symbol_id(file_path, sym)

                # Collect structured call references (fallback to string calls if call_refs empty)
                call_references = getattr(sym, "call_refs", [])
                if not call_references and sym.calls:
                    from ast_parser import CallReference
                    call_references = [CallReference(callee=c, receiver=None, is_member=False) for c in sym.calls]

                for call_ref in call_references:
                    callee = call_ref.callee
                    receiver = call_ref.receiver
                    target_id: Optional[str] = None

                    # --- TIER 1: Same class / parent scope or local function ---
                    if receiver in (None, "self", "cls"):
                        if sym.parent:
                            for other_id in self.file_to_symbols.get(file_path, []):
                                other_sym = self.symbols[other_id]
                                if other_sym.parent == sym.parent and other_sym.name == callee and other_id != sym_id:
                                    target_id = other_id
                                    break
                            # Inherited method from base class in same file
                            if not target_id:
                                class_id = f"{file_path}::{sym.parent}"
                                parent_class_sym = self.symbols.get(class_id)
                                if parent_class_sym and parent_class_sym.extends:
                                    for other_id in self.file_to_symbols.get(file_path, []):
                                        other_sym = self.symbols[other_id]
                                        if other_sym.parent in parent_class_sym.extends and other_sym.name == callee and other_id != sym_id:
                                            target_id = other_id
                                            break
                        if not target_id and receiver is None:
                            for other_id in self.file_to_symbols.get(file_path, []):
                                other_sym = self.symbols[other_id]
                                if other_sym.parent is None and other_sym.name == callee and other_id != sym_id:
                                    target_id = other_id
                                    break

                    # --- TIER 2: Import-aware receiver matching & cross-file resolution ---
                    if not target_id:
                        receiver_type = getattr(call_ref, "receiver_type", None)
                        receivers_to_check = [r for r in (receiver, receiver_type) if r and r not in ("self", "cls")]

                        for rcv in receivers_to_check:
                            # 1. Check if receiver matches an imported symbol or alias
                            for imp in f_res.imports:
                                matched_class = None
                                is_module_call = False

                                if rcv in imp.imported_symbols:
                                    matched_class = rcv
                                elif rcv in imp.alias_map.values():
                                    for orig, alias in imp.alias_map.items():
                                        if alias == rcv:
                                            matched_class = orig
                                            break
                                elif rcv == imp.module or rcv == imp.module.split(".")[-1]:
                                    is_module_call = True

                                if matched_class or is_module_call:
                                    tgt_file = self.resolve_target_file(file_path, imp)
                                    if tgt_file:
                                        for other_id in self.file_to_symbols.get(tgt_file, []):
                                            other_sym = self.symbols[other_id]
                                            if matched_class:
                                                # Match member method in imported class
                                                if other_sym.parent == matched_class and other_sym.name == callee:
                                                    target_id = other_id
                                                    break
                                            elif is_module_call:
                                                # Match top-level function in imported module
                                                if other_sym.parent is None and other_sym.name == callee:
                                                    target_id = other_id
                                                    break
                                    if target_id:
                                        break

                            # 2. Check if receiver is a known class in the global symbol table
                            if not target_id and rcv in self.symbols_by_name:
                                for class_sym_id in self.symbols_by_name[rcv]:
                                    class_file = self.symbol_id_to_file.get(class_sym_id)
                                    if class_file:
                                        for other_id in self.file_to_symbols.get(class_file, []):
                                            other_sym = self.symbols[other_id]
                                            if other_sym.parent == rcv and other_sym.name == callee:
                                                target_id = other_id
                                                break
                                    if target_id:
                                        break

                            if target_id:
                                break

                        if not target_id and not receivers_to_check:
                            # Receiver is None, but callee might be explicitly imported
                            for imp in f_res.imports:
                                if callee in imp.imported_symbols or callee in imp.alias_map.values():
                                    tgt_file = self.resolve_target_file(file_path, imp)
                                    if tgt_file:
                                        for other_id in self.file_to_symbols.get(tgt_file, []):
                                            if self.symbols[other_id].name == callee:
                                                target_id = other_id
                                                break
                                if target_id:
                                    break

                    # --- Fallback: Global unique match ---
                    if not target_id and callee in self.symbols_by_name:
                        is_module_receiver = bool(receiver and any(
                            receiver == imp.module or receiver == imp.module.split(".")[-1]
                            for imp in f_res.imports
                        ))
                        if not is_module_receiver:
                            candidates = [cid for cid in self.symbols_by_name[callee] if cid != sym_id]
                            if len(candidates) == 1:
                                cand_sym = self.symbols[candidates[0]]
                                if not receiver or cand_sym.parent is not None:
                                    target_id = candidates[0]

                    if target_id and target_id != sym_id:
                        self.callees_map[sym_id].add(target_id)
                        self.callers_map[target_id].add(sym_id)

        # Phase 2: Create Nodes with complete metadata
        for file_path, f_res in self.files.items():
            file_node_id = self._make_file_id(file_path)

            for sym in f_res.symbols:
                sym_id = self._make_symbol_id(file_path, sym)
                type_formatted = sym.symbol_type.capitalize()
                if sym.symbol_type == "module":
                    type_formatted = "Module"
                elif sym.symbol_type in {"class", "struct"}:
                    type_formatted = "Class"
                elif sym.symbol_type == "interface":
                    type_formatted = "Interface"
                elif sym.symbol_type in {"function", "method"}:
                    type_formatted = "Function" if sym.symbol_type == "function" else "Method"

                callers_list = list(self.callers_map.get(sym_id, set()))
                callees_list = list(self.callees_map.get(sym_id, set()))

                node_props = {
                    "name": sym.name,
                    "symbol_type": sym.symbol_type,
                    "type": type_formatted,
                    "file_path": file_path,
                    "start_line": sym.start_line,
                    "end_line": sym.end_line,
                    "signature": sym.signature,
                    "docstring": sym.docstring,
                    "decorators": sym.decorators,
                    "parent": sym.parent,
                    "visibility": sym.visibility,
                    "extends": sym.extends,
                    "callers": callers_list,
                    "callees": callees_list,
                    "source": file_path,
                    "dataset_name": self.dataset_name,
                }

                nodes.append({
                    "id": sym_id,
                    "label": sym.name,
                    "type": type_formatted,
                    "source": file_path,
                    "properties": node_props,
                })

        # Phase 3: Create Edges
        for file_path, f_res in self.files.items():
            file_node_id = self._make_file_id(file_path)

            # 1. Structural Edges: DEFINES & CONTAINS
            for sym in f_res.symbols:
                if sym.symbol_type == "module":
                    continue
                sym_id = self._make_symbol_id(file_path, sym)

                if sym.parent:
                    # Inside class -> CONTAINS edge from class to method
                    class_id = f"{file_path}::{sym.parent}"
                    if class_id not in self.symbols:
                        for other_id in self.file_to_symbols.get(file_path, []):
                            if self.symbols[other_id].name == sym.parent:
                                class_id = other_id
                                break
                    if class_id in self.symbols:
                        add_edge(class_id, sym_id, "CONTAINS", weight=1.0)
                    else:
                        add_edge(file_node_id, sym_id, "DEFINES", weight=1.0)
                else:
                    # Top-level -> DEFINES edge from module to symbol
                    add_edge(file_node_id, sym_id, "DEFINES", weight=1.0)

                # 2. Inheritance: EXTENDS
                for base in sym.extends:
                    # Resolve base class
                    base_id = None
                    for other_id in self.file_to_symbols.get(file_path, []):
                        if self.symbols[other_id].name == base:
                            base_id = other_id
                            break
                    if not base_id and base in self.symbols_by_name:
                        candidates = self.symbols_by_name[base]
                        if len(candidates) >= 1:
                            base_id = candidates[0]
                    if base_id:
                        add_edge(sym_id, base_id, "EXTENDS", weight=1.5, props={"base": base})

            # 3. IMPORTS Edges
            for imp in f_res.imports:
                target_file = self.resolve_target_file(file_path, imp)
                if target_file and target_file != file_path:
                    target_file_id = self._make_file_id(target_file)
                    add_edge(
                        file_node_id,
                        target_file_id,
                        "IMPORTS",
                        weight=1.2,
                        props={"module": imp.module, "symbols": imp.imported_symbols},
                    )

                    # Also link imported symbol if resolved
                    for sym_name in imp.imported_symbols:
                        for target_sym_id in self.file_to_symbols.get(target_file, []):
                            if self.symbols[target_sym_id].name == sym_name:
                                add_edge(
                                    file_node_id,
                                    target_sym_id,
                                    "IMPORTS",
                                    weight=1.0,
                                    props={"symbol": sym_name},
                                )

            # 4. CALLS Edges
            for sym in f_res.symbols:
                if sym.symbol_type == "module":
                    continue
                sym_id = self._make_symbol_id(file_path, sym)
                for callee_id in self.callees_map.get(sym_id, set()):
                    callee_sym = self.symbols.get(callee_id)
                    callee_name = callee_sym.name if callee_sym else "function"
                    add_edge(
                        sym_id,
                        callee_id,
                        "CALLS",
                        weight=1.0,
                        props={"caller": sym.name, "callee": callee_name},
                    )

            # Helper for Tier 3 scoped symbol resolution (type references and instantiations)
            def resolve_scoped_symbol(sym_name: str, cur_file: str, imports: list[ParsedImport]) -> Optional[str]:
                for s_id in self.file_to_symbols.get(cur_file, []):
                    if self.symbols[s_id].name == sym_name:
                        return s_id
                for imp in imports:
                    if sym_name in imp.imported_symbols or sym_name in imp.alias_map.values():
                        tgt_f = self.resolve_target_file(cur_file, imp)
                        if tgt_f:
                            for s_id in self.file_to_symbols.get(tgt_f, []):
                                if self.symbols[s_id].name == sym_name:
                                    return s_id
                cands = self.symbols_by_name.get(sym_name, [])
                if len(cands) == 1:
                    return cands[0]
                return None

            # 5. REFERENCES Edges (Type annotations)
            for sym in f_res.symbols:
                if sym.symbol_type == "module":
                    continue
                sym_id = self._make_symbol_id(file_path, sym)
                for type_name in getattr(sym, "type_references", []):
                    target_type_id = resolve_scoped_symbol(type_name, file_path, f_res.imports)
                    if target_type_id and target_type_id != sym_id:
                        add_edge(sym_id, target_type_id, "REFERENCES", weight=0.8, props={"type": type_name})

            # 6. USES Edges (Instantiated dependencies)
            for sym in f_res.symbols:
                if sym.symbol_type == "module":
                    continue
                sym_id = self._make_symbol_id(file_path, sym)
                for inst_name in getattr(sym, "instantiations", []):
                    target_inst_id = resolve_scoped_symbol(inst_name, file_path, f_res.imports)
                    if target_inst_id and target_inst_id != sym_id:
                        add_edge(sym_id, target_inst_id, "USES", weight=1.1, props={"target": inst_name})

        return nodes, edges
