Hey all,

currently we are facing an error during our native builds with the following versions:
* Netty 2.2.12.Final
* Spring Boot 4.0.5
* Liberica NIK 25.0.2+1-25.0.2+13

```plain
Warning: Using a deprecated option --report-unsupported-elements-at-runtime from 'META-INF/native-image/okhttp/okhttp/native-image.properties' in 'file:///workspace/ctr/native-image/BOOT-INF/lib/okhttp-jvm-5.3.2.jar'. The option is deprecated and will be removed in the future. The use of unsupported elements is always reported at run time.
Warning: Using a deprecated option --allow-incomplete-classpath from 'META-INF/native-image/com.oracle.database.jdbc/ojdbc11/native-image.properties' in 'file:///workspace/ctr/native-image/BOOT-INF/lib/ojdbc11-23.9.0.25.07.jar'. Allowing an incomplete classpath is now the default. Use --link-at-build-time to report linking errors at image build time for a class or package.
Warning: Using a deprecated option --allow-incomplete-classpath from 'META-INF/native-image/com.oracle.database.jdbc/ojdbc17/native-image.properties' in 'file:///workspace/ctr/native-image/BOOT-INF/lib/ojdbc17-23.26.0.0.0.jar'. Allowing an incomplete classpath is now the default. Use --link-at-build-time to report linking errors at image build time for a class or package.
Warning: Option 'DynamicProxyConfigurationResources' is deprecated and might be removed in a future release: This can be caused by a proxy-config.json file in your META-INF directory. Consider including proxy configuration in the reflection section of reachability-metadata.md instead.. Please refer to the GraalVM release notes.
Warning: Option 'DynamicProxyConfigurationResources' is deprecated and might be removed in a future release: This can be caused by a proxy-config.json file in your META-INF directory. Consider including proxy configuration in the reflection section of reachability-metadata.md instead.. Please refer to the GraalVM release notes.
Warning: Option 'DynamicProxyConfigurationResources' is deprecated and might be removed in a future release: This can be caused by a proxy-config.json file in your META-INF directory. Consider including proxy configuration in the reflection section of reachability-metadata.md instead.. Please refer to the GraalVM release notes.
Warning: Option 'DynamicProxyConfigurationResources' is deprecated and might be removed in a future release: This can be caused by a proxy-config.json file in your META-INF directory. Consider including proxy configuration in the reflection section of reachability-metadata.md instead.. Please refer to the GraalVM release notes.
========================================================================================================================
GraalVM Native Image: Generating 'ctr' (executable)...
========================================================================================================================
For detailed information and explanations on the build output, visit:
https://github.com/oracle/graal/blob/master/docs/reference-manual/native-image/BuildOutput.md
------------------------------------------------------------------------------------------------------------------------
Warning: The URL protocol file is enabled by default. The option --enable-url-protocols=file is not needed.
Warning: Unknown attribute(s) [allDeclaredClasses, allPublicClasses] in reflection class descriptor object
[1/8] Initializing...                                                                                   (12,0s @ 0,71GB)
 Java version: 25.0.2+13-LTS, vendor version: Liberica-NIK-25.0.2-1
 Graal compiler: optimization level: 2, target machine: x86-64
 C compiler: gcc (redhat, x86_64, 14.3.1)
 Garbage collector: Serial GC (max heap size: 80% of RAM)
 5 user-specific feature(s):
 - com.oracle.svm.thirdparty.gson.GsonFeature
 - okhttp3.internal.graal.OkHttpFeature
 - oracle.jdbc.nativeimage.NativeImageFeature
 - org.eclipse.angus.activation.nativeimage.AngusActivationFeature
 - org.springframework.aot.nativex.feature.PreComputeFieldFeature
------------------------------------------------------------------------------------------------------------------------
 2 experimental option(s) unlocked:
 - '-H:+SharedArenaSupport' (origin(s): command line)
 - '-H:ServiceLoaderFeatureExcludeServices' (origin(s): 'META-INF/native-image/org.springframework/spring-orm/native-image.properties' in 'file:///workspace/ctr/native-image/BOOT-INF/lib/spring-orm-7.0.6.jar')
------------------------------------------------------------------------------------------------------------------------
Build resources:
 - 16,23GB of memory (75,6% of system memory, in container)
 - 8 thread(s) (100,0% of 8 available processor(s), determined at start)
SLF4J(W): No SLF4J providers were found.
SLF4J(W): Defaulting to no-operation (NOP) logger implementation
SLF4J(W): See https://www.slf4j.org/codes.html#noProviders for further details.
WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::objectFieldOffset has been called by io.netty.util.internal.shaded.org.jctools.util.UnsafeAccess (file:/workspace/ctr/native-image/BOOT-INF/lib/netty-common-4.2.12.Final.jar)
WARNING: Please consider reporting this to the maintainers of class io.netty.util.internal.shaded.org.jctools.util.UnsafeAccess
WARNING: sun.misc.Unsafe::objectFieldOffset will be removed in a future release
[2/8] Performing analysis...  []                                                                      (144,5s @ 10,01GB)
   71.884 types, 134.296 fields, and 493.406 methods found reachable
   41.470 types,  49.035 fields, and 216.539 methods registered for reflection
        0 downcalls and 0 upcalls registered for foreign access

Fatal error: com.oracle.graal.pointsto.util.AnalysisError$ParsingError: Error encountered while parsing io.netty.util.internal.CleanerJava24Linker.malloc(CleanerJava24Linker.java:216) 
Parsing context:
   at io.netty.util.internal.CleanerJava24Linker$CleanableDirectBufferImpl.<init>(CleanerJava24Linker.java:242)
   at io.netty.util.internal.CleanerJava24Linker.allocate(CleanerJava24Linker.java:198)
   at io.netty.util.internal.PlatformDependent.allocateDirect(PlatformDependent.java:633)
   at io.netty.buffer.UnpooledByteBufAllocator$InstrumentedUnpooledDirectByteBuf.allocateDirectBuffer(UnpooledByteBufAllocator.java:249)
   at io.netty.buffer.UnpooledDirectByteBuf.<init>(UnpooledDirectByteBuf.java:70)
   at io.netty.buffer.UnpooledByteBufAllocator.newDirectBuffer(UnpooledByteBufAllocator.java:95)
   at io.netty.buffer.AbstractByteBufAllocator.directBuffer(AbstractByteBufAllocator.java:168)
   at io.netty.buffer.AbstractByteBufAllocator.directBuffer(AbstractByteBufAllocator.java:159)
   at io.netty.buffer.AbstractByteBufAllocator.buffer(AbstractByteBufAllocator.java:96)
   at io.netty.handler.codec.base64.Base64$Decoder.decode(Base64.java:381)
   at io.netty.handler.codec.base64.Base64.decode(Base64.java:365)
   at io.netty.handler.codec.base64.Base64.decode(Base64.java:356)
   at io.netty.handler.codec.base64.Base64.decode(Base64.java:344)
   at io.netty.handler.ssl.PemReader.readCertificates(PemReader.java:93)
   at io.netty.handler.ssl.SslContext.toX509Certificates(SslContext.java:1331)
   at io.netty.handler.ssl.JdkSslServerContext.checkIfWrappingTrustManagerIsSupported(JdkSslServerContext.java:75)
   at io.netty.handler.ssl.JdkSslServerContext.<clinit>(JdkSslServerContext.java:62)
   at static root method.(Unknown Source)

	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.util.AnalysisError.parsingError(AnalysisError.java:165)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlow.createFlowsGraph(MethodTypeFlow.java:188)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlow.ensureFlowsGraphCreated(MethodTypeFlow.java:151)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlow.getOrCreateMethodFlowsGraphInfo(MethodTypeFlow.java:109)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.typestate.DefaultStaticInvokeTypeFlow.lambda$update$0(DefaultStaticInvokeTypeFlow.java:81)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.util.LightImmutableCollection.forEach(LightImmutableCollection.java:90)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.typestate.DefaultStaticInvokeTypeFlow.update(DefaultStaticInvokeTypeFlow.java:80)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.typestate.DefaultStaticInvokeTypeFlow.lambda$onFlowEnabled$0(DefaultStaticInvokeTypeFlow.java:60)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.AbstractAnalysisEngine$1.run(AbstractAnalysisEngine.java:338)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.util.CompletionExecutor.executeCommand(CompletionExecutor.java:166)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.util.CompletionExecutor.lambda$executeService$0(CompletionExecutor.java:152)
	at java.base/java.util.concurrent.ForkJoinTask$RunnableExecuteAction.compute(ForkJoinTask.java:1750)
	at java.base/java.util.concurrent.ForkJoinTask$RunnableExecuteAction.compute(ForkJoinTask.java:1742)
	at java.base/java.util.concurrent.ForkJoinTask$InterruptibleTask.exec(ForkJoinTask.java:1659)
	at java.base/java.util.concurrent.ForkJoinTask.doExec(ForkJoinTask.java:511)
	at java.base/java.util.concurrent.ForkJoinPool$WorkQueue.topLevelExec(ForkJoinPool.java:1450)
	at java.base/java.util.concurrent.ForkJoinPool.runWorker(ForkJoinPool.java:2019)
	at java.base/java.util.concurrent.ForkJoinWorkerThread.run(ForkJoinWorkerThread.java:187)
Caused by: com.oracle.svm.core.util.VMError$HostedError: should not reach here: unexpected input could not be handled: linkToNative
	at org.graalvm.nativeimage.builder/com.oracle.svm.core.util.VMError.shouldNotReachHereUnexpectedInput(VMError.java:97)
	at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.substitute.PolymorphicSignatureWrapperMethod.buildGraph(PolymorphicSignatureWrapperMethod.java:170)
	at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.substitute.SubstitutionMethod.buildGraph(SubstitutionMethod.java:122)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.buildGraph(AnalysisMethod.java:757)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.AnalysisParsedGraph.parseBytecodeForStage(AnalysisParsedGraph.java:174)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.AnalysisParsedGraph.createFinalStage(AnalysisParsedGraph.java:243)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.lambda$static$2(AnalysisMethod.java:1204)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.setGraph(AnalysisMethod.java:1273)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.createAnalysisParsedGraph(AnalysisMethod.java:1256)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.ensureGraphParsedHelper(AnalysisMethod.java:1162)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.ensureGraphParsed(AnalysisMethod.java:1023)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.meta.AnalysisMethod.ensureGraphParsed(AnalysisMethod.java:1015)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.phases.InlineBeforeAnalysisGraphDecoder.lookupEncodedGraph(InlineBeforeAnalysisGraphDecoder.java:181)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.doInline(PEGraphDecoder.java:1215)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.tryInline(PEGraphDecoder.java:1198)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.trySimplifyInvoke(PEGraphDecoder.java:1053)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.handleInvokeWithCallTarget(PEGraphDecoder.java:1005)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.handleInvoke(PEGraphDecoder.java:991)
	at jdk.graal.compiler/jdk.graal.compiler.nodes.GraphDecoder.processNextNode(GraphDecoder.java:881)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.phases.InlineBeforeAnalysisGraphDecoder.processNextNode(InlineBeforeAnalysisGraphDecoder.java:269)
	at jdk.graal.compiler/jdk.graal.compiler.nodes.GraphDecoder.decode(GraphDecoder.java:609)
	at jdk.graal.compiler/jdk.graal.compiler.replacements.PEGraphDecoder.decode(PEGraphDecoder.java:895)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.phases.InlineBeforeAnalysis.decodeGraph(InlineBeforeAnalysis.java:73)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlowBuilder.parse(MethodTypeFlowBuilder.java:240)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlowBuilder.apply(MethodTypeFlowBuilder.java:739)
	at org.graalvm.nativeimage.pointsto/com.oracle.graal.pointsto.flow.MethodTypeFlow.createFlowsGraph(MethodTypeFlow.java:166)
	... 16 more
------------------------------------------------------------------------------------------------------------------------
                      16,1s (10,1% of total time) in 630 GCs | Peak RSS: 12,66GB | CPU load: 6,94
========================================================================================================================
Failed generating 'ctr' after 2m 38s.
```

I saw that there are some checks regarding Java25: https://github.com/netty/netty/blob/netty-4.2.12.Final/common/src/main/java/io/netty/util/internal/CleanerJava24Linker.java but I don't know why this issue occurs.

I can't provide a sample app but I hope you can reproduce it with the versions listed at the top of the description.
