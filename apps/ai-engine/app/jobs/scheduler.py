from apscheduler.schedulers.blocking import BlockingScheduler

scheduler = BlockingScheduler()

scheduler.add_job(
    sync_all_stocks,
    "interval",
    hours=6
)

scheduler.start()