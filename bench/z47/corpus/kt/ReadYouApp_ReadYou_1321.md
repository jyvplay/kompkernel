Version: 0.16.2
Device: samsung SM-S721U1
System: Android 16 (API 36)

Stack trace: 

```java.lang.NullPointerException
	at me.ash.reader.ui.page.adaptive.ArticleListReaderViewModel$initData$1.invokeSuspend(ArticleListReaderViewModel.kt:243)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:9)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:112)
	at android.os.Handler.handleCallback(Handler.java:1070)
	at android.os.Handler.dispatchMessage(Handler.java:125)
	at android.os.Looper.dispatchMessage(Looper.java:358)
	at android.os.Looper.loopOnce(Looper.java:288)
	at android.os.Looper.loop(Looper.java:392)
	at android.app.ActivityThread.main(ActivityThread.java:10346)
	at java.lang.reflect.Method.invoke(Native Method)
	at com.android.internal.os.RuntimeInit$MethodAndArgsCaller.run(RuntimeInit.java:638)
	at com.android.internal.os.ZygoteInit.main(ZygoteInit.java:972)
	Suppressed: kotlinx.coroutines.internal.DiagnosticCoroutineContextException: [StandaloneCoroutine{Cancelling}@cec85d2, Dispatchers.Main.immediate]
```
