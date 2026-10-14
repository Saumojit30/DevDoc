"""
Comprehensive Verification Test Suite for Native CodeGraph Elevation.
Tests AST structured call reference extraction, 3-tier symbol lookup,
typed edge generation (REFERENCES, USES), and NetworkX topological analysis.
"""

import unittest
from ast_parser import ASTParser, CallReference, ParsedImport, ParsedSymbol
from symbol_table import SymbolTable
from graph_topology import GraphTopologyEngine


class TestASTParserExtraction(unittest.TestCase):
    def test_structured_call_references(self):
        code = """
class Worker:
    def process(self, item: TaskItem) -> Result:
        self.validate(item)
        CogneeService.chat("project", "question")
        engine = Engine()
        return Result(status="ok")

    def validate(self, item):
        pass
"""
        result = ASTParser.parse_code("worker.py", code, "python")
        self.assertIsNone(result.error)

        symbols_by_name = {s.name: s for s in result.symbols}
        self.assertIn("process", symbols_by_name)
        process_sym = symbols_by_name["process"]

        # Verify call_refs
        callee_map = {cr.callee: cr for cr in process_sym.call_refs}
        self.assertIn("validate", callee_map)
        self.assertEqual(callee_map["validate"].receiver, "self")
        self.assertTrue(callee_map["validate"].is_member)

        self.assertIn("chat", callee_map)
        self.assertEqual(callee_map["chat"].receiver, "CogneeService")
        self.assertTrue(callee_map["chat"].is_member)

        # Verify type references
        self.assertIn("TaskItem", process_sym.type_references)
        self.assertIn("Result", process_sym.type_references)

        # Verify instantiations
        self.assertIn("Engine", process_sym.instantiations)


class TestThreeTierResolution(unittest.TestCase):
    def setUp(self):
        self.st = SymbolTable(dataset_name="test_dataset")

    def test_tier1_same_class_resolution(self):
        code = """
class Service:
    def execute(self):
        self.helper()

    def helper(self):
        pass
"""
        res = ASTParser.parse_code("service.py", code, "python")
        self.st.add_file_result(res)
        nodes, edges = self.st.build_graph()

        call_edges = [e for e in edges if e["relation"] == "CALLS"]
        self.assertEqual(len(call_edges), 1)
        self.assertEqual(call_edges[0]["source"], "service.py::Service.execute")
        self.assertEqual(call_edges[0]["target"], "service.py::Service.helper")

    def test_tier2_import_aware_receiver_matching(self):
        # Solves the exact bug where main.py::chat calling CogneeService.chat was dropped
        cognee_code = """
class CogneeService:
    def chat(self, project: str, question: str):
        return {"status": "ok"}
"""
        main_code = """
from cognee_service import CogneeService

def chat(req):
    return CogneeService.chat("proj", "query")
"""
        res_cognee = ASTParser.parse_code("cognee_service.py", cognee_code, "python")
        res_main = ASTParser.parse_code("main.py", main_code, "python")

        self.st.add_file_result(res_cognee)
        self.st.add_file_result(res_main)
        nodes, edges = self.st.build_graph()

        call_edges = [e for e in edges if e["relation"] == "CALLS" and e["source"] == "main.py::chat"]
        self.assertEqual(len(call_edges), 1)
        self.assertEqual(call_edges[0]["target"], "cognee_service.py::CogneeService.chat")

    def test_tier3_references_and_uses_edges(self):
        models_code = """
class ChatRequest:
    pass

class DatabaseConnection:
    pass
"""
        api_code = """
from models import ChatRequest, DatabaseConnection

def handle_request(req: ChatRequest):
    db = DatabaseConnection()
    return "ok"
"""
        res_models = ASTParser.parse_code("models.py", models_code, "python")
        res_api = ASTParser.parse_code("api.py", api_code, "python")

        self.st.add_file_result(res_models)
        self.st.add_file_result(res_api)
        nodes, edges = self.st.build_graph()

        ref_edges = [e for e in edges if e["relation"] == "REFERENCES"]
        self.assertTrue(any(e["source"] == "api.py::handle_request" and e["target"] == "models.py::ChatRequest" for e in ref_edges))

        uses_edges = [e for e in edges if e["relation"] == "USES"]
        self.assertTrue(any(e["source"] == "api.py::handle_request" and e["target"] == "models.py::DatabaseConnection" for e in uses_edges))

    def test_recursive_call_does_not_create_self_loop(self):
        code = """
def countdown(n: int):
    if n > 0:
        countdown(n - 1)
"""
        res = ASTParser.parse_code("recursion.py", code, "python")
        self.st.add_file_result(res)
        nodes, edges = self.st.build_graph()
        call_edges = [e for e in edges if e["relation"] == "CALLS"]
        self.assertEqual(len(call_edges), 0)

    def test_async_function_calls(self):
        code = """
async def fetch_data():
    return await parse_response()

async def parse_response():
    return {}
"""
        res = ASTParser.parse_code("async_module.py", code, "python")
        self.st.add_file_result(res)
        nodes, edges = self.st.build_graph()
        call_edges = [e for e in edges if e["relation"] == "CALLS"]
        self.assertEqual(len(call_edges), 1)
        self.assertEqual(call_edges[0]["source"], "async_module.py::fetch_data")
        self.assertEqual(call_edges[0]["target"], "async_module.py::parse_response")

    def test_instance_method_call_with_variable_and_name_collision(self):
        cognee_code = """
class CogneeService:
    def chat(self, project: str, question: str):
        return "answer"
"""
        other_code = """
def chat():
    return "other"
"""
        main_code = """
from cognee_service import CogneeService

def chat(req):
    service = CogneeService()
    return service.chat("proj", "query")
"""
        res_cognee = ASTParser.parse_code("cognee_service.py", cognee_code, "python")
        res_other = ASTParser.parse_code("other.py", other_code, "python")
        res_main = ASTParser.parse_code("main.py", main_code, "python")

        self.st.add_file_result(res_cognee)
        self.st.add_file_result(res_other)
        self.st.add_file_result(res_main)
        nodes, edges = self.st.build_graph()

        call_edges = [e for e in edges if e["relation"] == "CALLS" and e["source"] == "main.py::chat" and e["target"] == "cognee_service.py::CogneeService.chat"]
        self.assertEqual(len(call_edges), 1)

    def test_parameter_annotated_receiver_call(self):
        cognee_code = """
class CogneeService:
    def chat(self, project: str, question: str):
        return "answer"
"""
        api_code = """
from cognee_service import CogneeService

def handle_endpoint(service: CogneeService):
    return service.chat("proj", "query")
"""
        res_cognee = ASTParser.parse_code("cognee_service.py", cognee_code, "python")
        res_api = ASTParser.parse_code("api.py", api_code, "python")

        self.st.add_file_result(res_cognee)
        self.st.add_file_result(res_api)
        nodes, edges = self.st.build_graph()

        call_edges = [e for e in edges if e["relation"] == "CALLS" and e["source"] == "api.py::handle_endpoint"]
        self.assertTrue(any(e["target"] == "cognee_service.py::CogneeService.chat" for e in call_edges))

    def test_inherited_method_call_in_same_file(self):
        code = """
class BaseService:
    def setup(self):
        pass

class ChildService(BaseService):
    def run(self):
        self.setup()
"""
        res = ASTParser.parse_code("service.py", code, "python")
        self.st.add_file_result(res)
        nodes, edges = self.st.build_graph()

        call_edges = [e for e in edges if e["relation"] == "CALLS" and e["source"] == "service.py::ChildService.run"]
        self.assertEqual(len(call_edges), 1)
        self.assertEqual(call_edges[0]["target"], "service.py::BaseService.setup")

    def test_module_call_does_not_match_class_method(self):
        utils_code = """
class Formatter:
    def format_text(self):
        pass
"""
        caller_code = """
import utils

def execute():
    utils.format_text()
"""
        res_utils = ASTParser.parse_code("utils.py", utils_code, "python")
        res_caller = ASTParser.parse_code("caller.py", caller_code, "python")

        self.st.add_file_result(res_utils)
        self.st.add_file_result(res_caller)
        nodes, edges = self.st.build_graph()

        # utils.format_text() must NOT falsely resolve to Formatter.format_text
        call_edges = [e for e in edges if e["relation"] == "CALLS" and e["source"] == "caller.py::execute"]
        self.assertEqual(len(call_edges), 0)

    def test_qualified_type_annotation_no_module_pollution(self):
        code = """
def process(req: schemas.ChatRequest) -> models.Result:
    pass
"""
        res = ASTParser.parse_code("worker.py", code, "python")
        sym = [s for s in res.symbols if s.name == "process"][0]
        self.assertIn("ChatRequest", sym.type_references)
        self.assertIn("Result", sym.type_references)
        self.assertNotIn("schemas", sym.type_references)
        self.assertNotIn("models", sym.type_references)


class TestGraphTopologyEngine(unittest.TestCase):
    def test_community_detection_and_centrality(self):
        # Create a graph with two clear clusters connected by a bridge node
        # Cluster 1: Hub1 connected to A, B, C, D
        # Cluster 2: Hub2 connected to E, F, G, H
        # Bridge: Hub1 connected to Hub2
        nodes = [
            {"id": "Hub1", "label": "Hub1"},
            {"id": "A", "label": "A"},
            {"id": "B", "label": "B"},
            {"id": "C", "label": "C"},
            {"id": "D", "label": "D"},
            {"id": "Hub2", "label": "Hub2"},
            {"id": "E", "label": "E"},
            {"id": "F", "label": "F"},
            {"id": "G", "label": "G"},
            {"id": "H", "label": "H"},
        ]
        edges = [
            {"source": "Hub1", "target": "A"},
            {"source": "Hub1", "target": "B"},
            {"source": "Hub1", "target": "C"},
            {"source": "Hub1", "target": "D"},
            {"source": "Hub2", "target": "E"},
            {"source": "Hub2", "target": "F"},
            {"source": "Hub2", "target": "G"},
            {"source": "Hub2", "target": "H"},
            {"source": "Hub1", "target": "Hub2"},
        ]

        enriched_nodes, enriched_edges = GraphTopologyEngine.enrich_graph(nodes, edges)
        node_map = {n["id"]: n for n in enriched_nodes}

        # Verify communities
        hub1_comm = node_map["Hub1"]["community_id"]
        hub2_comm = node_map["Hub2"]["community_id"]
        self.assertNotEqual(hub1_comm, hub2_comm)

        # Community naming by highest-degree hub
        self.assertIn("Hub1", [node_map["Hub1"]["community_name"], node_map["Hub2"]["community_name"]])

        # Verify centrality
        self.assertGreater(node_map["Hub1"]["degree_centrality"], node_map["A"]["degree_centrality"])
        self.assertGreater(node_map["Hub1"]["betweenness_centrality"], node_map["A"]["betweenness_centrality"])

    def test_god_node_flagging(self):
        # Create a God Node with degree >= 12
        god_node = {"id": "CentralGod", "label": "CentralGod"}
        nodes = [god_node]
        edges = []
        for i in range(13):
            sub_id = f"Leaf_{i}"
            nodes.append({"id": sub_id, "label": sub_id})
            edges.append({"source": "CentralGod", "target": sub_id})

        enriched_nodes, _ = GraphTopologyEngine.enrich_graph(nodes, edges)
        node_map = {n["id"]: n for n in enriched_nodes}

        self.assertTrue(node_map["CentralGod"]["is_god_node"])
        self.assertFalse(node_map["Leaf_0"]["is_god_node"])

    def test_empty_and_disconnected_graphs(self):
        # Empty graph
        nodes, edges = GraphTopologyEngine.enrich_graph([], [])
        self.assertEqual(nodes, [])
        self.assertEqual(edges, [])

        # Isolated nodes without edges
        iso_nodes = [{"id": "Solo1"}, {"id": "Solo2"}]
        enriched_nodes, _ = GraphTopologyEngine.enrich_graph(iso_nodes, [])
        self.assertEqual(len(enriched_nodes), 2)
        self.assertEqual(enriched_nodes[0]["degree"], 0)


    def test_god_node_criteria(self):
        # 1. Degree criteria: degree >= 12 triggers God Node
        nodes_deg = [{"id": "DegGod"}] + [{"id": f"D_{i}"} for i in range(12)]
        edges_deg = [{"source": "DegGod", "target": f"D_{i}"} for i in range(12)]
        en_deg, _ = GraphTopologyEngine.enrich_graph(nodes_deg, edges_deg)
        m_deg = {n["id"]: n for n in en_deg}
        self.assertTrue(m_deg["DegGod"]["is_god_node"])
        self.assertEqual(m_deg["DegGod"]["degree"], 12)

        # 2. Non-god node: leaf node
        self.assertFalse(m_deg["D_0"]["is_god_node"])
        self.assertEqual(m_deg["D_0"]["degree"], 1)

    def test_weighted_betweenness_centrality(self):
        # A and B are strongly coupled (weight 10). C is a weak bystander (weights 1).
        nodes = [{"id": "A"}, {"id": "B"}, {"id": "C"}]
        edges = [
            {"source": "A", "target": "B", "weight": 10.0},
            {"source": "A", "target": "C", "weight": 1.0},
            {"source": "C", "target": "B", "weight": 1.0},
        ]
        en_nodes, _ = GraphTopologyEngine.enrich_graph(nodes, edges)
        node_map = {n["id"]: n for n in en_nodes}
        # C should NOT sit on the shortest path between A and B because A-B coupling is much stronger
        self.assertEqual(node_map["C"]["betweenness_centrality"], 0.0)


if __name__ == "__main__":
    unittest.main()
