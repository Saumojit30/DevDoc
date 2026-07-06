import asyncio
import cognee

async def run():
    ds_list = await cognee.datasets.list_datasets()
    print("Datasets:", [(ds.id, ds.name) for ds in ds_list])
    for ds in ds_list:
        if "project_dev_doc_quickstart" in ds.name:
            data_items = await cognee.datasets.list_data(ds.id)
            print(f"Data for {ds.name}:")
            for item in data_items:
                print(f" - id={item.id}, name={getattr(item, 'name', None)}, url={getattr(item, 'url', None)}")

asyncio.run(run())
