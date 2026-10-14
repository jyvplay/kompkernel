### Cause of error
```java
Exception in thread "DefaultDispatcher-worker-1" com.nextcloud.client.network.ClientFactory$CreationException: com.owncloud.android.lib.common.accounts.AccountUtils$AccountNotFoundException: Error receiving password token
    at com.nextcloud.client.network.ClientFactoryImpl.createNextcloudClient(ClientFactoryImpl.java:51)
    at com.owncloud.android.ui.unifiedsearch.UnifiedSearchRemoteRepository$runAsyncWithNcClient$1.invokeSuspend(UnifiedSearchRemoteRepository.kt:30)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:108)
    at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run(LimitedDispatcher.kt:115)
    at kotlinx.coroutines.scheduling.TaskImpl.run(Tasks.kt:103)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:584)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:793)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:697)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:684)
Caused by: Exception in thread "DefaultDispatcher-worker-1" com.owncloud.android.lib.common.accounts.AccountUtils$AccountNotFoundException: Error receiving password token
    at com.owncloud.android.lib.common.OwnCloudClientFactory.createNextcloudClient(OwnCloudClientFactory.java:210)
    at com.owncloud.android.lib.common.OwnCloudClientFactory.createNextcloudClient(OwnCloudClientFactory.java:180)
    at com.nextcloud.client.network.ClientFactoryImpl.createNextcloudClient(ClientFactoryImpl.java:49)
    at com.owncloud.android.ui.unifiedsearch.UnifiedSearchRemoteRepository$runAsyncWithNcClient$1.invokeSuspend(UnifiedSearchRemoteRepository.kt:30)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:108)
    at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run(LimitedDispatcher.kt:115)
    at kotlinx.coroutines.scheduling.TaskImpl.run(Tasks.kt:103)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:584)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:793)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:697)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:684)
Caused by: Exception in thread "DefaultDispatcher-worker-1" com.owncloud.android.lib.common.accounts.AccountUtils$AccountNotFoundException: Error receiving password token (password==null)
    at com.owncloud.android.lib.common.OwnCloudClientFactory.createNextcloudClient(OwnCloudClientFactory.java:206)
    at com.owncloud.android.lib.common.OwnCloudClientFactory.createNextcloudClient(OwnCloudClientFactory.java:180)
    at com.nextcloud.client.network.ClientFactoryImpl.createNextcloudClient(ClientFactoryImpl.java:49)
    at com.owncloud.android.ui.unifiedsearch.UnifiedSearchRemoteRepository$runAsyncWithNcClient$1.invokeSuspend(UnifiedSearchRemoteRepository.kt:30)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:33)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:108)
    at kotlinx.coroutines.internal.LimitedDispatcher$Worker.run(LimitedDispatcher.kt:115)
    at kotlinx.coroutines.scheduling.TaskImpl.run(Tasks.kt:103)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:584)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:793)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:697)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:684)

```

### App information
* ID: `com.nextcloud.client`
* Version: `30290090`
* Build flavor: `gplay`

### Device information
* Brand: `realme`
* Device: `RMX2155L1`
* Model: `RMX2155`
* Id: `SP1A.210812.016`
* Product: `RMX2155EEA`

### Firmware
* SDK: `31`
* Release: `12`
* Incremental: `Q.GDPR.bf75e7-1`
