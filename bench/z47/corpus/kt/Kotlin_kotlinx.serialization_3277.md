Hello,

We had a crash when using `Protobuf.decodeFromByteArray` with type inference where the return type was nullable.

This is leading to a cryptic stacktrace, when fed with valid protobuf data.

Shouldn't the type be constrained to be non nullable by adding the `Any` upper bound?

```kotlin
public inline fun <reified Any : T> BinaryFormat.decodeFromByteArray(bytes: ByteArray): T =
    decodeFromByteArray(serializersModule.serializer(), bytes)
```

```stacktrace
kotlinx.serialization.protobuf.internal.ProtobufDecodingException: Unsupported start group or end group wire type: INVALID(-1)
    at kotlinx.serialization.SerializationException.<init>(SerializationExceptions.kt:56)
    at kotlinx.serialization.protobuf.internal.ProtobufDecodingException.<init>(Helpers.kt:145)
    at kotlinx.serialization.protobuf.internal.ProtobufDecodingException.<init>(Helpers.kt:145)
    at kotlinx.serialization.protobuf.internal.ProtobufReader.skipElement(ProtobufReader.kt:64)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeElementIndex(ProtobufDecoding.kt:320)
    at com.infomaniak.auth.backup.PasskeysBackup$$serializer.deserialize(PasskeysBackup.kt:26)
    at com.infomaniak.auth.backup.PasskeysBackup$$serializer.deserialize(PasskeysBackup.kt:26)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:258)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.internal.NullableSerializer.deserialize(NullableSerializer.kt:30)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:258)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.protobuf.ProtoBuf.decodeFromByteArray(ProtoBuf.kt:144)
    at com.infomaniak.auth.backup.BlockStoreBackup.readPasskeysBackup(BlockStoreBackup.kt:152)
    at com.infomaniak.auth.backup.BlockStoreBackup.access$readPasskeysBackup(BlockStoreBackup.kt:40)
    at com.infomaniak.auth.backup.BlockStoreBackup$readPasskeysBackup$1.invokeSuspend(BlockStoreBackup.kt:0)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:34)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:586)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:807)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:717)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:704)

kotlinx.serialization.protobuf.internal.ProtobufDecodingException: Fail to get element index for com.infomaniak.auth.backup.PasskeysBackup in com.infomaniak.auth.backup.PasskeysBackup
    at kotlinx.serialization.SerializationException.<init>(SerializationExceptions.kt:56)
    at kotlinx.serialization.protobuf.internal.ProtobufDecodingException.<init>(Helpers.kt:145)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeElementIndex(ProtobufDecoding.kt:338)
    at com.infomaniak.auth.backup.PasskeysBackup$$serializer.deserialize(PasskeysBackup.kt:26)
    at com.infomaniak.auth.backup.PasskeysBackup$$serializer.deserialize(PasskeysBackup.kt:26)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:258)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.internal.NullableSerializer.deserialize(NullableSerializer.kt:30)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:258)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.protobuf.ProtoBuf.decodeFromByteArray(ProtoBuf.kt:144)
    at com.infomaniak.auth.backup.BlockStoreBackup.readPasskeysBackup(BlockStoreBackup.kt:152)
    at com.infomaniak.auth.backup.BlockStoreBackup.access$readPasskeysBackup(BlockStoreBackup.kt:40)
    at com.infomaniak.auth.backup.BlockStoreBackup$readPasskeysBackup$1.invokeSuspend(BlockStoreBackup.kt:0)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:34)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:586)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:807)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:717)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:704)

kotlinx.serialization.protobuf.internal.ProtobufDecodingException: Error while decoding com.infomaniak.auth.backup.PasskeysBackup at proto number 19500 of com.infomaniak.auth.backup.PasskeysBackup?
    at kotlinx.serialization.SerializationException.<init>(SerializationExceptions.kt:56)
    at kotlinx.serialization.protobuf.internal.ProtobufDecodingException.<init>(Helpers.kt:145)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:280)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.internal.NullableSerializer.deserialize(NullableSerializer.kt:30)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:258)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.protobuf.ProtoBuf.decodeFromByteArray(ProtoBuf.kt:144)
    at com.infomaniak.auth.backup.BlockStoreBackup.readPasskeysBackup(BlockStoreBackup.kt:152)
    at com.infomaniak.auth.backup.BlockStoreBackup.access$readPasskeysBackup(BlockStoreBackup.kt:40)
    at com.infomaniak.auth.backup.BlockStoreBackup$readPasskeysBackup$1.invokeSuspend(BlockStoreBackup.kt:0)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:34)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:586)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:807)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:717)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:704)

kotlinx.coroutines.internal.DiagnosticCoroutineContextException: null

kotlinx.serialization.protobuf.internal.ProtobufDecodingException: Error while decoding com.infomaniak.auth.backup.PasskeysBackup?
    at kotlinx.serialization.SerializationException.<init>(SerializationExceptions.kt:56)
    at kotlinx.serialization.protobuf.internal.ProtobufDecodingException.<init>(Helpers.kt:145)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:280)
    at kotlinx.serialization.protobuf.internal.ProtobufDecoder.decodeSerializableValue(ProtobufDecoding.kt:243)
    at kotlinx.serialization.protobuf.ProtoBuf.decodeFromByteArray(ProtoBuf.kt:144)
    at com.infomaniak.auth.backup.BlockStoreBackup.readPasskeysBackup(BlockStoreBackup.kt:152)
    at com.infomaniak.auth.backup.BlockStoreBackup.access$readPasskeysBackup(BlockStoreBackup.kt:40)
    at com.infomaniak.auth.backup.BlockStoreBackup$readPasskeysBackup$1.invokeSuspend(BlockStoreBackup.kt:0)
    at kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(ContinuationImpl.kt:34)
    at kotlinx.coroutines.DispatchedTask.run(DispatchedTask.kt:100)
    at kotlinx.coroutines.scheduling.CoroutineScheduler.runSafely(CoroutineScheduler.kt:586)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.executeTask(CoroutineScheduler.kt:807)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.runWorker(CoroutineScheduler.kt:717)
    at kotlinx.coroutines.scheduling.CoroutineScheduler$Worker.run(CoroutineScheduler.kt:704)
```

It looks a bit related to this old issue: https://github.com/Kotlin/kotlinx.serialization/issues/1695
