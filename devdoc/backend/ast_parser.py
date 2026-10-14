"""
AST Parsing Engine for DevDoc.
Extracts deep syntactic code symbols (classes, functions, interfaces, structs, methods, imports, calls)
across Python, TypeScript/JavaScript, Go, and Rust.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional


@dataclass
class ParsedImport:
    module: str
    imported_symbols: list[str] = field(default_factory=list)
    alias_map: dict[str, str] = field(default_factory=dict)
    is_relative: bool = False
    level: int = 0  # 1 for '.', 2 for '..', etc.
    line_number: int = 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "module": self.module,
            "imported_symbols": self.imported_symbols,
            "alias_map": self.alias_map,
            "is_relative": self.is_relative,
            "level": self.level,
            "line_number": self.line_number,
        }


@dataclass
class CallReference:
    callee: str
    receiver: Optional[str] = None
    is_member: bool = False
    receiver_type: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "callee": self.callee,
            "receiver": self.receiver,
            "is_member": self.is_member,
            "receiver_type": self.receiver_type,
        }


@dataclass
class ParsedSymbol:
    name: str
    symbol_type: str  # "module", "class", "interface", "struct", "function", "method", "enum"
    file_path: str
    start_line: int
    end_line: int
    signature: str = ""
    docstring: str = ""
    decorators: list[str] = field(default_factory=list)
    parent: Optional[str] = None  # Class name if method
    calls: list[str] = field(default_factory=list)
    call_refs: list[CallReference] = field(default_factory=list)
    type_references: list[str] = field(default_factory=list)
    instantiations: list[str] = field(default_factory=list)
    extends: list[str] = field(default_factory=list)
    visibility: str = "public"  # "public", "private", "protected"

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "symbol_type": self.symbol_type,
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "signature": self.signature,
            "docstring": self.docstring,
            "decorators": self.decorators,
            "parent": self.parent,
            "calls": self.calls,
            "call_refs": [ref.to_dict() for ref in self.call_refs],
            "type_references": self.type_references,
            "instantiations": self.instantiations,
            "extends": self.extends,
            "visibility": self.visibility,
        }


@dataclass
class FileASTResult:
    file_path: str
    language: str
    module_name: str
    imports: list[ParsedImport] = field(default_factory=list)
    symbols: list[ParsedSymbol] = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_path": self.file_path,
            "language": self.language,
            "module_name": self.module_name,
            "imports": [imp.to_dict() for imp in self.imports],
            "symbols": [sym.to_dict() for sym in self.symbols],
            "error": self.error,
        }


# =====================================================================
# PYTHON AST EXTRACTOR
# =====================================================================

class _PythonVisitor(ast.NodeVisitor):
    def __init__(self, file_path: str, source_lines: list[str]):
        self.file_path = file_path
        self.source_lines = source_lines
        self.imports: list[ParsedImport] = []
        self.symbols: list[ParsedSymbol] = []
        self.current_class: Optional[str] = None

    def _get_signature_from_lines(self, start_line: int, end_line: int) -> str:
        if start_line < 1 or start_line > len(self.source_lines):
            return ""
        # Take lines until the ':' that ends the header
        header_lines = []
        for i in range(start_line - 1, min(end_line, len(self.source_lines))):
            line = self.source_lines[i]
            header_lines.append(line.strip())
            if ":" in line:
                break
        return " ".join(header_lines)

    def _extract_calls_and_refs(
        self, node: ast.AST
    ) -> tuple[list[str], list[CallReference], list[str], list[str]]:
        call_names = []
        call_refs = []
        instantiations = []
        type_refs = []
        local_var_types: dict[str, str] = {}

        TYPE_IGNORE = {
            "int", "str", "float", "bool", "list", "dict", "set", "tuple",
            "Optional", "Union", "Any", "Callable", "None", "bytes", "object",
        }

        def extract_types_from_annotation(ann_node: Optional[ast.AST]):
            if ann_node is None:
                return
            if isinstance(ann_node, ast.Name):
                if ann_node.id not in TYPE_IGNORE and ann_node.id not in type_refs:
                    type_refs.append(ann_node.id)
            elif isinstance(ann_node, ast.Attribute):
                if ann_node.attr not in TYPE_IGNORE and ann_node.attr not in type_refs:
                    type_refs.append(ann_node.attr)
            elif isinstance(ann_node, ast.Subscript):
                extract_types_from_annotation(ann_node.value)
                extract_types_from_annotation(ann_node.slice)
            elif isinstance(ann_node, ast.BinOp):
                extract_types_from_annotation(ann_node.left)
                extract_types_from_annotation(ann_node.right)
            elif isinstance(ann_node, ast.Tuple):
                for elt in ann_node.elts:
                    extract_types_from_annotation(elt)
            elif isinstance(ann_node, ast.Constant):
                if isinstance(ann_node.value, str) and ann_node.value not in TYPE_IGNORE and ann_node.value not in type_refs:
                    type_refs.append(ann_node.value)

        # Pre-populate local_var_types from function parameter type annotations
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            all_args = getattr(node.args, "posonlyargs", []) + node.args.args + getattr(node.args, "kwonlyargs", [])
            for arg in all_args:
                if arg.annotation:
                    ann_type = None
                    if isinstance(arg.annotation, ast.Name):
                        ann_type = arg.annotation.id
                    elif isinstance(arg.annotation, ast.Attribute):
                        ann_type = arg.annotation.attr
                    elif isinstance(arg.annotation, ast.Constant) and isinstance(arg.annotation.value, str):
                        ann_type = arg.annotation.value
                    if ann_type and ann_type not in TYPE_IGNORE:
                        local_var_types[arg.arg] = ann_type

        def walk_scope(current_node: ast.AST, is_root: bool = True):
            if not is_root:
                # Do not descend into nested functions or classes
                if isinstance(current_node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    return

            # Track variable assignments: e.g. service = CogneeService()
            if isinstance(current_node, ast.Assign):
                assigned_type = None
                if isinstance(current_node.value, ast.Call):
                    f = current_node.value.func
                    if isinstance(f, ast.Name) and f.id and f.id[0].isupper():
                        assigned_type = f.id
                    elif isinstance(f, ast.Attribute) and f.attr and f.attr[0].isupper():
                        assigned_type = f.attr
                if assigned_type:
                    for target in current_node.targets:
                        if isinstance(target, ast.Name):
                            local_var_types[target.id] = assigned_type
                        elif isinstance(target, ast.Attribute):
                            try:
                                local_var_types[ast.unparse(target)] = assigned_type
                            except Exception:
                                pass

            if isinstance(current_node, ast.AnnAssign):
                if current_node.annotation:
                    extract_types_from_annotation(current_node.annotation)
                    ann_type = None
                    if isinstance(current_node.annotation, ast.Name):
                        ann_type = current_node.annotation.id
                    elif isinstance(current_node.annotation, ast.Attribute):
                        ann_type = current_node.annotation.attr
                    elif isinstance(current_node.annotation, ast.Constant) and isinstance(current_node.annotation.value, str):
                        ann_type = current_node.annotation.value
                    if ann_type and ann_type not in TYPE_IGNORE:
                        if isinstance(current_node.target, ast.Name):
                            local_var_types[current_node.target.id] = ann_type
                        elif isinstance(current_node.target, ast.Attribute):
                            try:
                                local_var_types[ast.unparse(current_node.target)] = ann_type
                            except Exception:
                                pass

            if isinstance(current_node, ast.Call):
                func = current_node.func
                callee = None
                receiver = None
                is_member = False

                if isinstance(func, ast.Name):
                    callee = func.id
                    receiver = None
                    is_member = False
                elif isinstance(func, ast.Attribute):
                    callee = func.attr
                    is_member = True
                    try:
                        receiver = ast.unparse(func.value)
                    except Exception:
                        receiver = getattr(func.value, "id", getattr(func.value, "attr", None))

                receiver_type = None
                if receiver:
                    receiver_type = local_var_types.get(receiver)

                if callee:
                    call_names.append(callee)
                    call_refs.append(
                        CallReference(
                            callee=callee,
                            receiver=receiver,
                            is_member=is_member,
                            receiver_type=receiver_type,
                        )
                    )
                    # Class instantiation: e.g. Engine() or DatabaseConnection()
                    if callee[0].isupper():
                        instantiations.append(callee)

            for child in ast.iter_child_nodes(current_node):
                walk_scope(child, is_root=False)

        walk_scope(node, is_root=True)

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            all_args = getattr(node.args, "posonlyargs", []) + node.args.args + getattr(node.args, "kwonlyargs", [])
            for arg in all_args:
                if arg.annotation:
                    extract_types_from_annotation(arg.annotation)
            if node.returns:
                extract_types_from_annotation(node.returns)

        unique_call_names = list(dict.fromkeys(call_names))
        seen_refs = set()
        unique_call_refs = []
        for cr in call_refs:
            key = (cr.callee, cr.receiver, cr.receiver_type)
            if key not in seen_refs:
                seen_refs.add(key)
                unique_call_refs.append(cr)

        unique_instantiations = list(dict.fromkeys(instantiations))
        unique_type_refs = list(dict.fromkeys(type_refs))

        return unique_call_names, unique_call_refs, unique_instantiations, unique_type_refs

    def _extract_calls_from_node(self, node: ast.AST) -> list[str]:
        return self._extract_calls_and_refs(node)[0]

    def _format_arg(self, arg: ast.arg) -> str:
        annotation = ""
        if arg.annotation:
            try:
                annotation = f": {ast.unparse(arg.annotation)}"
            except Exception:
                annotation = ""
        return f"{arg.arg}{annotation}"

    def _format_function_signature(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
        prefix = "async def " if isinstance(node, ast.AsyncFunctionDef) else "def "
        args_list = []

        posonly = getattr(node.args, "posonlyargs", [])
        all_pos = posonly + node.args.args
        defaults = node.args.defaults
        num_defaults = len(defaults)
        default_offset = len(all_pos) - num_defaults

        for idx, arg in enumerate(posonly):
            ann = f": {ast.unparse(arg.annotation)}" if arg.annotation else ""
            default_val = ""
            if idx >= default_offset:
                d_idx = idx - default_offset
                if 0 <= d_idx < len(defaults):
                    try:
                        default_val = f" = {ast.unparse(defaults[d_idx])}"
                    except Exception:
                        pass
            args_list.append(f"{arg.arg}{ann}{default_val}")

        if posonly:
            args_list.append("/")

        for idx, arg in enumerate(node.args.args, start=len(posonly)):
            ann = f": {ast.unparse(arg.annotation)}" if arg.annotation else ""
            default_val = ""
            if idx >= default_offset:
                d_idx = idx - default_offset
                if 0 <= d_idx < len(defaults):
                    try:
                        default_val = f" = {ast.unparse(defaults[d_idx])}"
                    except Exception:
                        pass
            args_list.append(f"{arg.arg}{ann}{default_val}")

        if node.args.vararg:
            ann = f": {ast.unparse(node.args.vararg.annotation)}" if node.args.vararg.annotation else ""
            args_list.append(f"*{node.args.vararg.arg}{ann}")
        elif node.args.kwonlyargs and not posonly:
            args_list.append("*")

        for idx, arg in enumerate(node.args.kwonlyargs):
            ann = f": {ast.unparse(arg.annotation)}" if arg.annotation else ""
            kw_def = node.args.kw_defaults[idx] if idx < len(node.args.kw_defaults) else None
            default_val = ""
            if kw_def is not None:
                try:
                    default_val = f" = {ast.unparse(kw_def)}"
                except Exception:
                    pass
            args_list.append(f"{arg.arg}{ann}{default_val}")

        if node.args.kwarg:
            ann = f": {ast.unparse(node.args.kwarg.annotation)}" if node.args.kwarg.annotation else ""
            args_list.append(f"**{node.args.kwarg.arg}{ann}")

        params = ", ".join(args_list)
        ret = ""
        if node.returns:
            try:
                ret = f" -> {ast.unparse(node.returns)}"
            except Exception:
                ret = ""
        return f"{prefix}{node.name}({params}){ret}"

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            alias_map = {alias.name: alias.asname} if alias.asname else {}
            self.imports.append(
                ParsedImport(
                    module=alias.name,
                    imported_symbols=[alias.name],
                    alias_map=alias_map,
                    is_relative=False,
                    line_number=node.lineno,
                )
            )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        module = node.module or ""
        symbols = [alias.name for alias in node.names]
        alias_map = {alias.name: alias.asname for alias in node.names if alias.asname}
        self.imports.append(
            ParsedImport(
                module=module,
                imported_symbols=symbols,
                alias_map=alias_map,
                is_relative=bool(node.level and node.level > 0),
                level=node.level or 0,
                line_number=node.lineno,
            )
        )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        prev_class = self.current_class
        self.current_class = node.name

        docstring = ast.get_docstring(node) or ""
        decorators = []
        for dec in node.decorator_list:
            try:
                decorators.append(ast.unparse(dec))
            except Exception:
                if isinstance(dec, ast.Name):
                    decorators.append(dec.id)

        bases = []
        for base in node.bases:
            try:
                bases.append(ast.unparse(base))
            except Exception:
                if isinstance(base, ast.Name):
                    bases.append(base.id)

        start_line = node.lineno
        end_line = getattr(node, "end_lineno", node.lineno)
        base_str = f"({', '.join(bases)})" if bases else ""
        signature = f"class {node.name}{base_str}:"

        calls, call_refs, instantiations, type_refs = self._extract_calls_and_refs(node)

        self.symbols.append(
            ParsedSymbol(
                name=node.name,
                symbol_type="class",
                file_path=self.file_path,
                start_line=start_line,
                end_line=end_line,
                signature=signature,
                docstring=docstring,
                decorators=decorators,
                parent=prev_class,
                calls=calls,
                call_refs=call_refs,
                type_references=type_refs,
                instantiations=instantiations,
                extends=bases,
                visibility="private" if node.name.startswith("_") and not node.name.startswith("__") else "public",
            )
        )

        self.generic_visit(node)
        self.current_class = prev_class

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._handle_function(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._handle_function(node, is_async=True)

    def _handle_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool):
        docstring = ast.get_docstring(node) or ""
        decorators = []
        for dec in node.decorator_list:
            try:
                decorators.append(ast.unparse(dec))
            except Exception:
                if isinstance(dec, ast.Name):
                    decorators.append(dec.id)

        try:
            signature = self._format_function_signature(node)
        except Exception:
            signature = self._get_signature_from_lines(node.lineno, getattr(node, "end_lineno", node.lineno))

        start_line = node.lineno
        end_line = getattr(node, "end_lineno", node.lineno)
        calls, call_refs, instantiations, type_refs = self._extract_calls_and_refs(node)

        symbol_type = "method" if self.current_class else "function"
        visibility = "private" if node.name.startswith("_") and not (node.name.startswith("__") and node.name.endswith("__")) else "public"

        self.symbols.append(
            ParsedSymbol(
                name=node.name,
                symbol_type=symbol_type,
                file_path=self.file_path,
                start_line=start_line,
                end_line=end_line,
                signature=signature,
                docstring=docstring,
                decorators=decorators,
                parent=self.current_class,
                calls=calls,
                call_refs=call_refs,
                type_references=type_refs,
                instantiations=instantiations,
                extends=[],
                visibility=visibility,
            )
        )

        # Do not recurse into nested function bodies for current_class scoping
        self.generic_visit(node)


class PythonASTExtractor:
    @classmethod
    def parse(cls, file_path: str, code: str) -> FileASTResult:
        source_lines = code.splitlines()
        rel_path = file_path.replace("\\", "/")
        module_name = Path(rel_path).stem

        try:
            tree = ast.parse(code, filename=file_path)
            visitor = _PythonVisitor(rel_path, source_lines)
            visitor.visit(tree)

            # Module docstring
            mod_doc = ast.get_docstring(tree) or ""
            if mod_doc or visitor.symbols:
                # Add a module symbol representing top-level container
                visitor.symbols.insert(
                    0,
                    ParsedSymbol(
                        name=module_name,
                        symbol_type="module",
                        file_path=rel_path,
                        start_line=1,
                        end_line=len(source_lines) or 1,
                        signature=f"module {module_name}",
                        docstring=mod_doc,
                        visibility="public",
                    ),
                )

            return FileASTResult(
                file_path=rel_path,
                language="python",
                module_name=module_name,
                imports=visitor.imports,
                symbols=visitor.symbols,
            )
        except Exception as exc:
            return FileASTResult(
                file_path=rel_path,
                language="python",
                module_name=module_name,
                error=f"Python AST parse error: {exc}",
            )


# =====================================================================
# TYPESCRIPT / JAVASCRIPT EXTRACTOR
# =====================================================================

class TypeScriptExtractor:
    @classmethod
    def parse(cls, file_path: str, code: str) -> FileASTResult:
        rel_path = file_path.replace("\\", "/")
        module_name = Path(rel_path).stem
        lines = code.splitlines()
        imports: list[ParsedImport] = []
        symbols: list[ParsedSymbol] = []

        try:
            # 1. Extract Imports across full code (including multi-line imports)
            import_es6_re = re.compile(
                r'import\s+(?:type\s+)?(?:([\w*\s{},]+)\s+from\s+)?[\'"]([^\'"]+)[\'"]',
                re.DOTALL,
            )
            require_re = re.compile(
                r'(?:const|let|var)\s+([\w\s{},]+)\s*=\s*require\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
                re.DOTALL,
            )

            for match in import_es6_re.finditer(code):
                raw_symbols, mod_path = match.groups()
                line_idx = code[: match.start()].count("\n") + 1
                imported_symbols = []
                alias_map = {}
                if raw_symbols:
                    raw_symbols = raw_symbols.strip()
                    if "{" in raw_symbols and "}" in raw_symbols:
                        inner = raw_symbols[raw_symbols.find("{") + 1 : raw_symbols.find("}")]
                        for sym in inner.split(","):
                            sym = sym.strip()
                            if not sym:
                                continue
                            if " as " in sym:
                                orig, alias = sym.split(" as ", 1)
                                imported_symbols.append(orig.strip())
                                alias_map[orig.strip()] = alias.strip()
                            else:
                                imported_symbols.append(sym)
                    elif raw_symbols.startswith("* as "):
                        imported_symbols.append(raw_symbols[5:].strip())
                    else:
                        for part in raw_symbols.split(","):
                            part = part.strip()
                            if part and not part.startswith("{"):
                                imported_symbols.append(part)

                imports.append(
                    ParsedImport(
                        module=mod_path,
                        imported_symbols=imported_symbols,
                        alias_map=alias_map,
                        is_relative=mod_path.startswith("."),
                        level=1 if mod_path.startswith("./") else (2 if mod_path.startswith("../") else 0),
                        line_number=line_idx,
                    )
                )

            for match in require_re.finditer(code):
                raw_symbols, mod_path = match.groups()
                line_idx = code[: match.start()].count("\n") + 1
                imported_symbols = [s.strip() for s in re.sub(r"[{}]", "", raw_symbols).split(",") if s.strip()]
                imports.append(
                    ParsedImport(
                        module=mod_path,
                        imported_symbols=imported_symbols,
                        is_relative=mod_path.startswith("."),
                        level=1 if mod_path.startswith("./") else (2 if mod_path.startswith("../") else 0),
                        line_number=line_idx,
                    )
                )

            # 2. Extract Calls across full file
            call_re = re.compile(r'\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(')
            def extract_line_calls(text: str) -> list[str]:
                keywords = {"if", "for", "while", "switch", "catch", "function", "return", "import", "require", "typeof"}
                found = []
                for m in call_re.finditer(text):
                    c = m.group(1)
                    if c not in keywords and c not in found:
                        found.append(c)
                return found

            # 3. Extract Classes, Interfaces, Functions
            class_re = re.compile(
                r'^(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+([a-zA-Z_$][a-zA-Z0-9_$]*))?(?:\s+implements\s+([\w\s,]+))?'
            )
            interface_re = re.compile(
                r'^(?:export\s+)?interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+([\w\s,]+))?'
            )
            type_re = re.compile(
                r'^(?:export\s+)?type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*='
            )
            func_re = re.compile(
                r'^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*)\)(?:\s*:\s*([^\{]+))?'
            )
            arrow_re = re.compile(
                r'^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?(?:\((.*)\)|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*(?::\s*([^=]+))?\s*=>'
            )
            method_re = re.compile(
                r'^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\((.*)\)(?:\s*:\s*([^\{]+))?'
            )

            current_class_name: Optional[str] = None
            class_brace_depth = 0
            brace_count = 0

            def get_header(start_idx: int) -> str:
                hdr = []
                paren_depth = 0
                for k in range(start_idx, min(len(lines), start_idx + 25)):
                    line_k = lines[k].strip()
                    hdr.append(line_k)
                    paren_depth += line_k.count("(") - line_k.count(")")
                    if paren_depth <= 0:
                        if "{" in line_k or "=>" in line_k or ";" in line_k:
                            break
                return " ".join(hdr)

            # Scan lines
            for i, line in enumerate(lines, start=1):
                clean = line.strip()

                # Extract JSDoc before line if present
                docstring = ""
                if i > 1:
                    prev_idx = i - 2
                    if lines[prev_idx].strip().endswith("*/"):
                        doc_lines = []
                        while prev_idx >= 0:
                            p_line = lines[prev_idx].strip()
                            doc_lines.insert(0, p_line)
                            if p_line.startswith("/*") or p_line.startswith("/**"):
                                break
                            prev_idx -= 1
                        docstring = "\n".join(doc_lines)

                header_text = get_header(i - 1) if (not "{" in clean and not "=>" in clean and not clean.endswith(";")) else clean

                # Check Class
                class_match = class_re.match(header_text)
                if class_match:
                    cname = class_match.group(1)
                    extends_class = class_match.group(2)
                    implements_ifaces = class_match.group(3)
                    extends_list = []
                    if extends_class:
                        extends_list.append(extends_class.strip())
                    if implements_ifaces:
                        extends_list.extend([x.strip() for x in implements_ifaces.split(",") if x.strip()])

                    current_class_name = cname
                    brace_delta = clean.count("{") - clean.count("}")
                    class_brace_depth = brace_count + max(1, brace_delta)

                    symbols.append(
                        ParsedSymbol(
                            name=cname,
                            symbol_type="class",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=clean.split("{")[0].strip() or header_text.split("{")[0].strip(),
                            docstring=docstring,
                            extends=extends_list,
                            calls=extract_line_calls(clean),
                        )
                    )
                    brace_count += brace_delta
                    continue

                # Check Interface
                iface_match = interface_re.match(header_text)
                if iface_match:
                    iname = iface_match.group(1)
                    ext = iface_match.group(2)
                    ext_list = [x.strip() for x in ext.split(",")] if ext else []
                    symbols.append(
                        ParsedSymbol(
                            name=iname,
                            symbol_type="interface",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=clean.split("{")[0].strip() or header_text.split("{")[0].strip(),
                            docstring=docstring,
                            extends=ext_list,
                        )
                    )
                    brace_count += clean.count("{") - clean.count("}")
                    continue

                # Check Type
                type_match = type_re.match(clean)
                if type_match:
                    tname = type_match.group(1)
                    symbols.append(
                        ParsedSymbol(
                            name=tname,
                            symbol_type="interface",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=clean,
                            docstring=docstring,
                        )
                    )
                    brace_count += clean.count("{") - clean.count("}")
                    continue

                # Check Standard Function
                func_match = func_re.match(header_text)
                if func_match and not clean.startswith("class ") and not clean.startswith("interface "):
                    fname = func_match.group(1)
                    params = func_match.group(2) or ""
                    ret_type = func_match.group(3) or ""
                    sig = f"function {fname}({params}){(': ' + ret_type.strip()) if ret_type else ''}"
                    symbols.append(
                        ParsedSymbol(
                            name=fname,
                            symbol_type="function",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=sig,
                            docstring=docstring,
                            calls=extract_line_calls(clean),
                        )
                    )
                    brace_count += clean.count("{") - clean.count("}")
                    continue

                # Check Arrow Function
                arrow_match = arrow_re.match(header_text)
                if arrow_match:
                    fname = arrow_match.group(1)
                    params = arrow_match.group(2) or arrow_match.group(3) or ""
                    ret_type = arrow_match.group(4) or ""
                    sig = f"const {fname} = ({params}){(': ' + ret_type.strip()) if ret_type else ''} =>"
                    symbols.append(
                        ParsedSymbol(
                            name=fname,
                            symbol_type="function",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=sig,
                            docstring=docstring,
                            calls=extract_line_calls(clean),
                        )
                    )
                    brace_count += clean.count("{") - clean.count("}")
                    continue

                # Check Method inside class
                if current_class_name and not clean.startswith("if") and not clean.startswith("switch") and not clean.startswith("for"):
                    method_match = method_re.match(header_text)
                    if method_match:
                        mname = method_match.group(1)
                        if mname not in {"constructor", "if", "for", "while", "switch", "return"}:
                            params = method_match.group(2) or ""
                            ret_type = method_match.group(3) or ""
                            sig = f"{mname}({params}){(': ' + ret_type.strip()) if ret_type else ''}"
                            symbols.append(
                                ParsedSymbol(
                                    name=mname,
                                    symbol_type="method",
                                    file_path=rel_path,
                                    start_line=i,
                                    end_line=i,
                                    signature=sig,
                                    docstring=docstring,
                                    parent=current_class_name,
                                    calls=extract_line_calls(clean),
                                    visibility="private" if mname.startswith("#") or mname.startswith("_") else "public",
                                )
                            )

                brace_count += clean.count("{") - clean.count("}")
                if current_class_name and brace_count < class_brace_depth:
                    current_class_name = None

            # Add module level symbol
            symbols.insert(
                0,
                ParsedSymbol(
                    name=module_name,
                    symbol_type="module",
                    file_path=rel_path,
                    start_line=1,
                    end_line=len(lines) or 1,
                    signature=f"module {module_name}",
                    visibility="public",
                ),
            )

            return FileASTResult(
                file_path=rel_path,
                language="typescript" if file_path.endswith((".ts", ".tsx")) else "javascript",
                module_name=module_name,
                imports=imports,
                symbols=symbols,
            )
        except Exception as exc:
            return FileASTResult(
                file_path=rel_path,
                language="typescript" if file_path.endswith((".ts", ".tsx")) else "javascript",
                module_name=module_name,
                error=f"TS/JS AST parse error: {exc}",
            )


# =====================================================================
# GO & RUST EXTRACTOR
# =====================================================================

class GoRustExtractor:
    @classmethod
    def parse_go(cls, file_path: str, code: str) -> FileASTResult:
        rel_path = file_path.replace("\\", "/")
        module_name = Path(rel_path).stem
        lines = code.splitlines()
        imports: list[ParsedImport] = []
        symbols: list[ParsedSymbol] = []

        try:
            # Package
            pkg_re = re.compile(r'^package\s+([a-zA-Z0-9_]+)')
            import_single_re = re.compile(r'^import\s+[\'"]([^\'"]+)[\'"]')
            func_re = re.compile(r'^func\s+(?:\((.*?)\)\s+)?([a-zA-Z0-9_]+)\s*\((.*?)\)(?:\s*(.*?))?\s*\{?')
            struct_re = re.compile(r'^type\s+([a-zA-Z0-9_]+)\s+struct\s*\{?')
            iface_re = re.compile(r'^type\s+([a-zA-Z0-9_]+)\s+interface\s*\{?')

            in_import_block = False

            for i, line in enumerate(lines, start=1):
                clean = line.strip()

                pkg_m = pkg_re.match(clean)
                if pkg_m:
                    module_name = pkg_m.group(1)
                    continue

                if clean == "import (" or clean.startswith("import ("):
                    in_import_block = True
                    continue
                if in_import_block:
                    if clean == ")":
                        in_import_block = False
                    else:
                        m = re.match(r'^(?:([a-zA-Z0-9_]+)\s+)?[\'"]([^\'"]+)[\'"]', clean)
                        if m:
                            alias, mod = m.groups()
                            alias_map = {mod: alias} if alias else {}
                            imports.append(ParsedImport(module=mod, alias_map=alias_map, line_number=i))
                    continue

                m_imp = import_single_re.match(clean)
                if m_imp:
                    imports.append(ParsedImport(module=m_imp.group(1), line_number=i))
                    continue

                # Struct
                m_str = struct_re.match(clean)
                if m_str:
                    sname = m_str.group(1)
                    symbols.append(
                        ParsedSymbol(
                            name=sname,
                            symbol_type="struct",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=f"type {sname} struct",
                            visibility="public" if sname[0].isupper() else "private",
                        )
                    )
                    continue

                # Interface
                m_if = iface_re.match(clean)
                if m_if:
                    iname = m_if.group(1)
                    symbols.append(
                        ParsedSymbol(
                            name=iname,
                            symbol_type="interface",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=f"type {iname} interface",
                            visibility="public" if iname[0].isupper() else "private",
                        )
                    )
                    continue

                # Func / Method
                m_fn = func_re.match(clean)
                if m_fn:
                    receiver, fname, params, ret = m_fn.groups()
                    parent = None
                    sym_type = "function"
                    if receiver:
                        sym_type = "method"
                        # e.g. (s *Server) or (s Server)
                        parts = receiver.strip().split()
                        parent = parts[-1].lstrip("*") if parts else None

                    sig = f"func {f'({receiver}) ' if receiver else ''}{fname}({params or ''}){(' ' + ret.strip()) if ret else ''}"
                    symbols.append(
                        ParsedSymbol(
                            name=fname,
                            symbol_type=sym_type,
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=sig,
                            parent=parent,
                            visibility="public" if fname[0].isupper() else "private",
                        )
                    )

            symbols.insert(
                0,
                ParsedSymbol(
                    name=module_name,
                    symbol_type="module",
                    file_path=rel_path,
                    start_line=1,
                    end_line=len(lines) or 1,
                    signature=f"package {module_name}",
                    visibility="public",
                ),
            )

            return FileASTResult(
                file_path=rel_path,
                language="go",
                module_name=module_name,
                imports=imports,
                symbols=symbols,
            )
        except Exception as exc:
            return FileASTResult(
                file_path=rel_path,
                language="go",
                module_name=module_name,
                error=f"Go AST parse error: {exc}",
            )

    @classmethod
    def parse_rust(cls, file_path: str, code: str) -> FileASTResult:
        rel_path = file_path.replace("\\", "/")
        module_name = Path(rel_path).stem
        lines = code.splitlines()
        imports: list[ParsedImport] = []
        symbols: list[ParsedSymbol] = []

        try:
            use_re = re.compile(r'^(?:pub\s+)?use\s+([^;]+);')
            struct_re = re.compile(r'^(?:pub(?:\([^\)]+\))?\s+)?struct\s+([a-zA-Z0-9_]+)')
            trait_re = re.compile(r'^(?:pub(?:\([^\)]+\))?\s+)?trait\s+([a-zA-Z0-9_]+)')
            impl_re = re.compile(r'^impl(?:\s*<[^>]+>)?\s+(?:([a-zA-Z0-9_]+)\s+for\s+)?([a-zA-Z0-9_]+)')
            fn_re = re.compile(r'^(?:pub(?:\([^\)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)\s*(?:<[^>]+>)?\s*\((.*?)\)(?:\s*->\s*([^\{]+))?')

            current_impl_struct: Optional[str] = None
            current_trait: Optional[str] = None

            for i, line in enumerate(lines, start=1):
                clean = line.strip()

                # Use import
                m_use = use_re.match(clean)
                if m_use:
                    raw_mod = m_use.group(1).strip()
                    imports.append(ParsedImport(module=raw_mod, line_number=i))
                    continue

                # Struct
                m_st = struct_re.match(clean)
                if m_st:
                    sname = m_st.group(1)
                    symbols.append(
                        ParsedSymbol(
                            name=sname,
                            symbol_type="struct",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=f"struct {sname}",
                            visibility="public" if "pub" in clean else "private",
                        )
                    )
                    continue

                # Trait
                m_tr = trait_re.match(clean)
                if m_tr:
                    tname = m_tr.group(1)
                    symbols.append(
                        ParsedSymbol(
                            name=tname,
                            symbol_type="interface",
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=f"trait {tname}",
                            visibility="public" if "pub" in clean else "private",
                        )
                    )
                    continue

                # Impl block
                m_impl = impl_re.match(clean)
                if m_impl:
                    trait_name, struct_name = m_impl.groups()
                    current_impl_struct = struct_name
                    current_trait = trait_name
                    continue

                # Fn
                m_fn = fn_re.match(clean)
                if m_fn:
                    fname = m_fn.group(1)
                    params = m_fn.group(2) or ""
                    ret = m_fn.group(3) or ""
                    sym_type = "method" if current_impl_struct else "function"
                    sig = f"fn {fname}({params}){(' -> ' + ret.strip()) if ret else ''}"
                    symbols.append(
                        ParsedSymbol(
                            name=fname,
                            symbol_type=sym_type,
                            file_path=rel_path,
                            start_line=i,
                            end_line=i,
                            signature=sig,
                            parent=current_impl_struct,
                            extends=[current_trait] if current_trait else [],
                            visibility="public" if "pub" in clean else "private",
                        )
                    )

                if clean.endswith("}") and current_impl_struct:
                    # simplistic reset on block close
                    current_impl_struct = None
                    current_trait = None

            symbols.insert(
                0,
                ParsedSymbol(
                    name=module_name,
                    symbol_type="module",
                    file_path=rel_path,
                    start_line=1,
                    end_line=len(lines) or 1,
                    signature=f"mod {module_name}",
                    visibility="public",
                ),
            )

            return FileASTResult(
                file_path=rel_path,
                language="rust",
                module_name=module_name,
                imports=imports,
                symbols=symbols,
            )
        except Exception as exc:
            return FileASTResult(
                file_path=rel_path,
                language="rust",
                module_name=module_name,
                error=f"Rust AST parse error: {exc}",
            )


# =====================================================================
# UNIFIED AST PARSER ENTRYPOINT
# =====================================================================

class ASTParser:
    @classmethod
    def parse_file(cls, file_path: str | Path, code: Optional[str] = None) -> FileASTResult:
        p = Path(file_path)
        if code is None:
            try:
                code = p.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                return FileASTResult(
                    file_path=str(p).replace("\\", "/"),
                    language="unknown",
                    module_name=p.stem,
                    error=f"Could not read file: {e}",
                )

        ext = p.suffix.lower()
        if ext == ".py":
            return PythonASTExtractor.parse(str(p), code)
        elif ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
            return TypeScriptExtractor.parse(str(p), code)
        elif ext == ".go":
            return GoRustExtractor.parse_go(str(p), code)
        elif ext == ".rs":
            return GoRustExtractor.parse_rust(str(p), code)
        else:
            # Generic fallback (e.g. for markdown, json, etc.)
            rel_path = str(p).replace("\\", "/")
            return FileASTResult(
                file_path=rel_path,
                language="text",
                module_name=p.stem,
                symbols=[
                    ParsedSymbol(
                        name=p.name,
                        symbol_type="module",
                        file_path=rel_path,
                        start_line=1,
                        end_line=len(code.splitlines()) or 1,
                        signature=p.name,
                    )
                ],
            )

    @classmethod
    def parse_code(cls, file_path: str, code: str, language: Optional[str] = None) -> FileASTResult:
        return cls.parse_file(file_path, code=code)

    @classmethod
    def parse_files(cls, file_paths: list[str | Path]) -> list[FileASTResult]:
        results = []
        for fp in file_paths:
            results.append(cls.parse_file(fp))
        return results
