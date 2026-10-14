## Application Crash Report (LC-500)

### Technical Stack Trace
```
           ==================================================
                       LIBRECUTS CRASH REPORT               
           ==================================================
           App Version : 1.0-beta7 (10)
           Device      : Xiaomi 2409BRN2CA (Android 15, API 35)
           Error Code  : LC-500
           
           --------------------------------------------------
           STACK TRACE:
           --------------------------------------------------
           java.lang.OutOfMemoryError: Failed to allocate a 268501000 byte allocation with 25165824 free bytes and 124MB until OOM, target footprint 162832960, growth limit 268435456
at java.util.Arrays.copyOf(Arrays.java:4275)
at java.lang.AbstractStringBuilder.ensureCapacityInternal(AbstractStringBuilder.java:301)
at java.lang.AbstractStringBuilder.append(AbstractStringBuilder.java:791)
at java.lang.StringBuffer.append(StringBuffer.java:422)
at java.io.StringWriter.write(StringWriter.java:99)
at kotlin.io.TextStreamsKt.copyTo(ReadWrite.kt:130)
at kotlin.io.TextStreamsKt.copyTo$default(ReadWrite.kt:125)
at kotlin.io.TextStreamsKt.readText(ReadWrite.kt:112)
at com.tharunbirla.librecuts.ProjectImportActivity$loadRecipe$1.invokeSuspend(ProjectImportActivity.kt:222)
at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:104)
at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run(LimitedDispatcher.kt:111)
at kotlinx.coroutines.scheduling.TaskImpl.run(Tasks.kt:99)
at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:584)
at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:811)
at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:715)
at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:702)
Suppressed: kotlinx.coroutines.internal.DiagnosticCoroutineContextException: [StandaloneCoroutine{Cancelling}@4137ca9, Dispatchers.IO]

           ==================================================
```

*Note: The complete stack trace has been copied to your clipboard.*
