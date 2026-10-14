### Describe the Issue

An error occurs when `-O1` and `--pgo-instrument` are written together.

> Can't PGO be applied in a `-O1` environment in the first place?

### Using the latest version of GraalVM can resolve many issues.

- [x] I tried with the [latest version](https://www.graalvm.org/downloads/) of GraalVM.

### GraalVM Version

java version "24.0.2" 2025-07-15
Java(TM) SE Runtime Environment Oracle GraalVM 24.0.2+11.1 (build 24.0.2+11-jvmci-b01)
Java HotSpot(TM) 64-Bit Server VM Oracle GraalVM 24.0.2+11.1 (build 24.0.2+11-jvmci-b01, mixed mode, sharing)

### Operating System and Version

Linux (redacted) 5.14.0-570.23.1.el9_6.x86_64 #1 SMP PREEMPT_DYNAMIC Thu Jun 26 19:29:53 UTC 2025 x86_64 x86_64 x86_64 GNU/Linux

### Build Command

./gradlew `Module-Name`/nativeCompile

> If you really need a project to build, i will create a project in an environment that can be reproduced.

### Expected Behavior

I expect the build to finish successfully



### Actual Behavior

The newPosition number varies each time.

```
Caused by: java.lang.IllegalArgumentException: newPosition < 0: (-1576599552 < 0)
        at java.base/java.nio.Buffer.createPositionException(Buffer.java:351)
        at java.base/java.nio.Buffer.position(Buffer.java:326)
        at java.base/java.nio.ByteBuffer.position(ByteBuffer.java:1561)
        at java.base/java.nio.MappedByteBuffer.position(MappedByteBuffer.java:329)
        at java.base/java.nio.MappedByteBuffer.position(MappedByteBuffer.java:74)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.writeBuffer(ObjectFile.java:1717)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.write(ObjectFile.java:1320)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.lambda$write$0(ObjectFile.java:1308)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.withDebugContext(ObjectFile.java:1848)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.write(ObjectFile.java:1307)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.image.NativeImage.write(NativeImage.java:175)
        ... 7 more
```

### Steps to Reproduce

```groovy
graalvmNative {
    binaries {
        main {
            mainClass = 'com.example.Application'

            debug.set(true)
            verbose.set(true)

            buildArgs.add("--gc=serial")
            buildArgs.add("-O1")

            buildArgs.add("--pgo-instrument")

            buildArgs.add("--no-fallback")
            buildArgs.add("--verbose")
            buildArgs.add("-H:+ReportExceptionStackTraces")
            buildArgs.add("-H:+ReportUnsupportedElementsAtRuntime")
            buildArgs.add("--enable-url-protocols=http,https")
            buildArgs.add("-H:+AddAllCharsets")
            buildArgs.add("--install-exit-handlers")
            buildArgs.add("-H:+AllowIncompleteClasspath")

            buildArgs.add('--initialize-at-build-time=org.redisson.liveobject.core.RedissonObjectBuilder$CodecMethodRef')
            buildArgs.add('--initialize-at-build-time=org.redisson.misc.BiHashMap')

            systemProperties.put("file.encoding", "UTF-8")
        }
    }
}
```

### Additional Context

_No response_

### Build Log Output and Error Messages

```
[1/8] Initializing...                                                                                   (22.1s @ 3.13GB)
 Java version: 24.0.2+11, vendor version: Oracle GraalVM 24.0.2+11.1
 Graal compiler: optimization level: 2, target machine: x86-64-v3, PGO: sampling+instrument
 C compiler: gcc (redhat, x86_64, 11.5.0)
 Garbage collector: Serial GC (max heap size: 80% of RAM)
 3 user-specific feature(s):
 - com.oracle.svm.thirdparty.gson.GsonFeature
 - org.eclipse.angus.activation.nativeimage.AngusActivationFeature
 - org.springframework.aot.nativex.feature.PreComputeFieldFeature
------------------------------------------------------------------------------------------------------------------------
 3 experimental option(s) unlocked:
 - '-H:ServiceLoaderFeatureExcludeServices' (origin(s): 'META-INF/native-image/org.springframework/spring-orm/native-image.properties' in 'file:///root/.gradle/caches/modules-2/files-2.1/org.springframework/spring-orm/6.2.8/3bfe2a04c09ad1d7738b16e6e4636a7255be3af8/spring-orm-6.2.8.jar')
 - '-H:+AllowIncompleteClasspath' (origin(s): command line)
 - '-H:+ReportUnsupportedElementsAtRuntime' (origin(s): command line)
------------------------------------------------------------------------------------------------------------------------
Build resources:
 - 47.92GB of memory (19.1% of 251.09GB system memory, set via '-Xmx50G')
 - 32 thread(s) (88.9% of 36 available processor(s), determined at start)
SLF4J(W): No SLF4J providers were found.
SLF4J(W): Defaulting to no-operation (NOP) logger implementation
SLF4J(W): See https://www.slf4j.org/codes.html#noProviders for further details.
[2/8] Performing analysis...  [******]                                                                 (93.4s @ 22.61GB)
  132,481 reachable types   (93.4% of  141,796 total)
  197,126 reachable fields  (59.1% of  333,516 total)
  713,903 reachable methods (66.1% of 1,079,433 total)
   45,553 types, 7,792 fields, and 15,744 methods registered for reflection
      141 types,   120 fields, and    96 methods registered for JNI access
        5 native libraries: dl, m, pthread, rt, z
[3/8] Building universe...                                                                             (30.0s @ 21.23GB)
[4/8] Parsing methods...      [***]                                                                    (10.5s @ 27.67GB)
[5/8] Inlining methods...     [**]                                                                      (1.2s @ 30.77GB)
[6/8] Compiling methods...    [*************]                                                         (190.8s @ 38.29GB)
[7/8] Laying out methods...   [**********]                                                            (111.5s @ 42.26GB)

[8/8] Creating image...       [****************]                                                        (0.0s @ 35.08GB)
------------------------------------------------------------------------------------------------------------------------
                     151.2s (17.8% of total time) in 143 GCs | Peak RSS: 53.67GB | CPU load: 14.21
------------------------------------------------------------------------------------------------------------------------
Build artifacts:
 /root/(redacted)/Native-App/{Module-Name}/build/native/nativeCompile/svm_err_b_20250904T173423.964_pid574207.md (build_info)
========================================================================================================================
Failed generating '{Module-Name}' after 14m 7s.

The build process encountered an unexpected error:

com.oracle.svm.core.util.VMError$HostedError: java.lang.IllegalArgumentException: newPosition < 0: (-1576599552 < 0)
        at org.graalvm.nativeimage.builder/com.oracle.svm.core.util.VMError.shouldNotReachHere(VMError.java:82)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.image.NativeImage.write(NativeImage.java:177)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.image.NativeImageViaCC.write(NativeImageViaCC.java:95)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGenerator.doRun(NativeImageGenerator.java:750)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGenerator.run(NativeImageGenerator.java:533)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGeneratorRunner.buildImage(NativeImageGeneratorRunner.java:545)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGeneratorRunner.build(NativeImageGeneratorRunner.java:732)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGeneratorRunner.start(NativeImageGeneratorRunner.java:151)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.NativeImageGeneratorRunner.main(NativeImageGeneratorRunner.java:99)
Caused by: java.lang.IllegalArgumentException: newPosition < 0: (-1576599552 < 0)
        at java.base/java.nio.Buffer.createPositionException(Buffer.java:351)
        at java.base/java.nio.Buffer.position(Buffer.java:326)
        at java.base/java.nio.ByteBuffer.position(ByteBuffer.java:1561)
        at java.base/java.nio.MappedByteBuffer.position(MappedByteBuffer.java:329)
        at java.base/java.nio.MappedByteBuffer.position(MappedByteBuffer.java:74)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.writeBuffer(ObjectFile.java:1717)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.write(ObjectFile.java:1320)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.lambda$write$0(ObjectFile.java:1308)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.withDebugContext(ObjectFile.java:1848)
        at org.graalvm.nativeimage.objectfile/com.oracle.objectfile.ObjectFile.write(ObjectFile.java:1307)
        at org.graalvm.nativeimage.builder/com.oracle.svm.hosted.image.NativeImage.write(NativeImage.java:175)
        ... 7 more

com.oracle.svm.driver.NativeImage$NativeImageError
        at org.graalvm.nativeimage.driver/com.oracle.svm.driver.NativeImage.showError(NativeImage.java:2430)
        at org.graalvm.nativeimage.driver/com.oracle.svm.driver.NativeImage.build(NativeImage.java:2012)
        at org.graalvm.nativeimage.driver/com.oracle.svm.driver.NativeImage.performBuild(NativeImage.java:1971)
        at org.graalvm.nativeimage.driver/com.oracle.svm.driver.NativeImage.main(NativeImage.java:1953)
        at java.base@24.0.2/java.lang.invoke.LambdaForm$DMH/sa346b79c.invokeStaticInit(LambdaForm$DMH)

> Task :{Module-Name}:nativeCompile FAILED

[Incubating] Problems report is available at: file:///root/(redacted)/Native-App/build/reports/problems/problems-report.html

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':{Module-Name}:nativeCompile'.
> Process 'command '/opt/graalvm/bin/native-image'' finished with non-zero exit value 1

* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.

Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.

You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.

For more on this, please refer to https://docs.gradle.org/8.14/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.

BUILD FAILED in 15m 13s
```
