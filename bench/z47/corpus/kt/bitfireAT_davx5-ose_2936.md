This is not reported by users but it was recorded via the Google Play Console for 4.5.20 (only 2 times so far). Can we catch it or does it point to a relevant problem?

Error: at.bitfire.synctools.util.AndroidAccountUtils.createAccount

Stacktrace:
```
Exception java.lang.SecurityException:
  at android.os.Parcel.createExceptionOrNull (Parcel.java:3388)
  at android.os.Parcel.createException (Parcel.java:3372)
  at android.os.Parcel.readException (Parcel.java:3355)
  at android.os.Parcel.readException (Parcel.java:3297)
  at android.accounts.IAccountManager$Stub$Proxy.addAccountExplicitly (IAccountManager.java:1267)
  at android.accounts.AccountManager.addAccountExplicitly (AccountManager.java:1013)
  at at.bitfire.synctools.util.AndroidAccountUtils.createAccount-GsVcMHE (AndroidAccountUtils.kt:37)
  at at.bitfire.davdroid.repository.AccountRepository.createBlocking (AccountRepository.java:130)
  at at.bitfire.davdroid.ui.setup.LoginScreenViewModel$createAccount$2$accountId$1.invokeSuspend (LoginScreenViewModel.java:370)
  at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith (ContinuationImpl.kt:34)
  at kotlinx.coroutines.DispatchedTask.run (DispatchedTask.kt:100)
  at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run (LimitedDispatcher.java:124)
  at kotlinx.coroutines.scheduling.TaskImpl.run (Tasks.kt:89)
  at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely (CoroutineScheduler.java:586)
  at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask (CoroutineScheduler.kt:798)
  at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker (CoroutineScheduler.kt:717)
  at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run (CoroutineScheduler.kt:704)
Caused by android.os.RemoteException: Remote stack trace:
  at com.android.server.accounts.AccountManagerService.addAccountExplicitlyWithVisibility (qb/113932616 7a1b34bb43e0d53b0da229c5e2c2ba0ba803d312dd74acd8f81c76e2fbb2beec:112)
  at com.android.server.accounts.AccountManagerService.addAccountExplicitly (qb/113932616 7a1b34bb43e0d53b0da229c5e2c2ba0ba803d312dd74acd8f81c76e2fbb2beec:7)
  at android.accounts.IAccountManager$Stub.onTransact (IAccountManager.java:567)
  at com.android.server.accounts.AccountManagerService.onTransact (qb/113932616 7a1b34bb43e0d53b0da229c5e2c2ba0ba803d312dd74acd8f81c76e2fbb2beec:1)
  at android.os.Binder.execTransactInternal (Binder.java:1509)
```
