import asyncio
import cognee

async def run():
    # Use the quickstart project since it has docs ingested
    res = await cognee.get_schema_inventory(dataset='project_project_alpha', samples_per_type=5)
    print("Schema Inventory:")
    print(res)

    res2 = await cognee.get_datasets()
    print("Datasets:")
    print(res2)

asyncio.run(run())
