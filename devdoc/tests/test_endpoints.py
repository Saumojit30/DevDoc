import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))


import asyncio
import cognee
from cognee_service import CogneeService

async def test():
    # 1. Test chat with auto-routing
    print("=== Test 1: Chat with recall auto-routing ===")
    result = await CogneeService.chat("devdoc", "What is this project about?", session_id="test_session_001")
    print(f"  role: {result.get('role')}")
    print(f"  content length: {len(result.get('content', ''))}")
    print(f"  session_id: {result.get('session_id')}")
    print(f"  sources: {result.get('sources')}")
    print()

    # 2. Test triplet embeddings
    print("=== Test 2: Triplet embeddings ===")
    try:
        result2 = await CogneeService.create_triplet_embeddings()
        print(f"  status: {result2}")
    except Exception as e:
        print(f"  SKIPPED (needs prior ingestion): {e}")
    print()

    # 3. Test visualize graph
    print("=== Test 3: Visualize graph ===")
    try:
        html = await cognee.visualize_graph(dataset="devdoc", include_session_events=True)
        print(f"  HTML length: {len(html)} chars")
        print(f"  First 100: {html[:100]}")
    except Exception as e:
        print(f"  ERROR: {e}")
    print()

    print("=== DONE ===")

asyncio.run(test())
