### Checklist

- [x] I've already searched in [existing issues](https://github.com/ReadYouApp/ReadYou/issues?q=is%3Aissue+) and haven't found a similar problem reported.
- [ ] I'm using the [latest version](https://github.com/ReadYouApp/ReadYou/releases/latest) of the app
- [x] This error caused the app to crash
- [ ] This error is reproducible

### Which category best fits this error?

Feed Sync

### App version

0.16.2

### Reproduction steps

1. 
2.
3.
...


### Crash report

```text
Version: 0.16.2
Device: Google Pixel 10 Pro
System: Android 17 (API 37)

Stack trace: 

.lang.NullPointerException: Attempt to invoke interface method 'java.lang.Object kotlinx.coroutines.flow.Flow.collect(kotlinx.coroutines.flow.FlowCollector, kotlin.coroutines.Continuation)' on a null object reference
	at kotlinx.coroutines.flow.internal.CombineKt$combineInternal$2$1.invokeSuspend(Combine.kt:45)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:9)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:112)
	at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run(LimitedDispatcher.kt:8)
	at kotlinx.coroutines.scheduling.TaskImpl.run(Tasks.kt:3)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:93)
	Suppressed: kotlinx.coroutines.internal.DiagnosticCoroutineContextException: [StandaloneCoroutine{Cancelling}@e41587d, Dispatchers.Default]
```
