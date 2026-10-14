Hey got this issue today. Seems to conincide with the same day I got the new Pebble App update. 

Manufacturer: Google
Device: Pixel 9 (tokay)
OS: 17
OS Build: (removed) 
SDK: 37
App version: 2.21 (300)

com.matejdro.pebble.bluetooth.common.exceptions.UnrecoverableWatchTransferException: No Pebble app is installed
	at com.matejdro.pebble.bluetooth.common.PacketQueue.sendPacket(PacketQueue.kt:101)
	at com.matejdro.pebble.bluetooth.common.PacketQueue.runQueue(PacketQueue.kt:78)
	at com.matejdro.pebble.bluetooth.common.PacketQueue$runQueue$1.invokeSuspend(PacketQueue.kt:0)
	at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:34)
	at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
	at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:586)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:807)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:717)
	at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:704)

