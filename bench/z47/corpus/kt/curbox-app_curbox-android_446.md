### Summary

Navigating to a blocked URL will close the browser, but not the tab, this can make the browser unusable

### Steps to Reproduce

1. Add a new keyword block list with `reddit.com/r/gaming`, zero usage hours, and no unlock
2. Navigate to the website in Firefox (using v156.0.1) or Chrome (I can't check the version now because it keeps crashing from this bug)
3. It will close the browser and display the warning popup
5. Enter back into the browser. 
    - In Chrome, it will kick you out again.
    - In Firefox, click the "tabs" button in the button right and select the blocked tab.

### Actual Behavior

Adding a website to the blocked keyword list, e.g. `reddit.com/r/gaming` will close the browser when navigating to that site. However, it will not close the tab. 

In Chrome, this will cause an infinite loop of being unable to open the browser because it will resume to the blocked website.

In Firefox, the user can open the browser back up and look at the contents of the tab.

### Environment

OnePlus 12, Android 16.0.10, Curbox 4-fdroid

### Additional Context (optional)

<details><summary>Crash Log</summary>
<p>

```
--- Non-Fatal Error (Caught) at 2026-10-01 15:47:47 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:47 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:47 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:47 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:48 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:48 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:50 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:51 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:51 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:53 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:47:53 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:00 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:01 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:01 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:01 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:01 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:02 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:06 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:07 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

--- Non-Fatal Error (Caught) at 2026-10-01 15:48:07 ---
java.lang.Exception: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:139)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:101)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:589)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:832)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:720)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:707)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
	at neth.iecal.curbox.trackers.ReelsCountTracker.onEvent(ReelsCountTracker.kt:94)
	at neth.iecal.curbox.services.AppBlockerService$startBackgroundWorker$1.invokeSuspend(AppBlockerService.kt:129)
	... 6 more

```

</p>
</details> 
