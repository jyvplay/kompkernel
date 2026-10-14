_Platform:_
- [ ]  Android -> If yes, which Device API (and compileSdkVersion/targetSdkVersion/Build tools) version?
- [X]  Java -> If yes, which Java (and sourceCompatibility/targetCompatibility) version? 
```    
targetCompatibility = sourceCompatibility = 14
```
- [ ]  Kotlin -> If yes, which Kotlin (and jvmTarget) version?
- [ ]  NDK -> If yes, which NDK/CMake version?
- [ ]  React-Native -> If yes, which version?
- [ ]  Timber -> If yes, which version?
- [ ]  Log4j -> If yes, which version?
- [X]  Logback -> If yes, which version? `1.2.3`
- [X]  Spring -> If yes, which version? `2.3.4.RELEASE`

_IDE:_
- [ ]  Android Studio -> If yes, which version?
- [X]  IntelliJ -> If yes, which version? `2020.2.2`
- [ ]  Other -> If yes, which one?

_Build system:_
- [X]  Gradle -> If yes, which version? `6.6.1`
- [ ]  Buck -> If yes, which version?
- [ ]  Bazel -> If yes, which version?
- [ ]  Maven -> If yes, which version?
- [ ]  Other -> If yes, which one?

_Android Gradle Plugin:_
- [ ]  Yes -> If yes, which version?
- [X]  No

_Sentry Android Gradle Plugin:_
- [ ]  Yes -> If yes, which version?
- [X]  No

_Proguard/R8:_
- [ ]  Enabled
- [ ]  Disabled

_Platform installed with:_
- [X] JCenter
- [ ] Bintray
- [ ] Maven Central
- [ ] Manually

The version of the SDK:
**3.1.0**

---
I have the following issue:

```
Failed to load ApplicationContext
java.lang.IllegalStateException: Failed to load ApplicationContext
	at org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate.loadContext(DefaultCacheAwareContextLoaderDelegate.java:132)
	at org.springframework.test.context.support.DefaultTestContext.getApplicationContext(DefaultTestContext.java:123)
	at org.springframework.boot.test.mock.mockito.MockitoTestExecutionListener.postProcessFields(MockitoTestExecutionListener.java:95)
	at org.springframework.boot.test.mock.mockito.MockitoTestExecutionListener.injectFields(MockitoTestExecutionListener.java:79)
	at org.springframework.boot.test.mock.mockito.MockitoTestExecutionListener.prepareTestInstance(MockitoTestExecutionListener.java:54)
	at org.springframework.test.context.TestContextManager.prepareTestInstance(TestContextManager.java:244)
	at org.springframework.test.context.junit.jupiter.SpringExtension.postProcessTestInstance(SpringExtension.java:98)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.lambda$invokeTestInstancePostProcessors$5(ClassBasedTestDescriptor.java:341)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.executeAndMaskThrowable(ClassBasedTestDescriptor.java:346)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.lambda$invokeTestInstancePostProcessors$6(ClassBasedTestDescriptor.java:341)
	at java.base/java.util.stream.ReferencePipeline$3$1.accept(ReferencePipeline.java:195)
	at java.base/java.util.stream.ReferencePipeline$2$1.accept(ReferencePipeline.java:177)
	at java.base/java.util.ArrayList$ArrayListSpliterator.forEachRemaining(ArrayList.java:1624)
	at java.base/java.util.stream.AbstractPipeline.copyInto(AbstractPipeline.java:484)
	at java.base/java.util.stream.AbstractPipeline.wrapAndCopyInto(AbstractPipeline.java:474)
	at java.base/java.util.stream.StreamSpliterators$WrappingSpliterator.forEachRemaining(StreamSpliterators.java:312)
	at java.base/java.util.stream.Streams$ConcatSpliterator.forEachRemaining(Streams.java:735)
	at java.base/java.util.stream.Streams$ConcatSpliterator.forEachRemaining(Streams.java:734)
	at java.base/java.util.stream.ReferencePipeline$Head.forEach(ReferencePipeline.java:658)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.invokeTestInstancePostProcessors(ClassBasedTestDescriptor.java:340)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.instantiateAndPostProcessTestInstance(ClassBasedTestDescriptor.java:263)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.lambda$testInstancesProvider$2(ClassBasedTestDescriptor.java:256)
	at java.base/java.util.Optional.orElseGet(Optional.java:362)
	at org.junit.jupiter.engine.descriptor.ClassBasedTestDescriptor.lambda$testInstancesProvider$3(ClassBasedTestDescriptor.java:255)
	at org.junit.jupiter.engine.execution.TestInstancesProvider.getTestInstances(TestInstancesProvider.java:29)
	at org.junit.jupiter.engine.descriptor.TestMethodTestDescriptor.lambda$prepare$0(TestMethodTestDescriptor.java:108)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.jupiter.engine.descriptor.TestMethodTestDescriptor.prepare(TestMethodTestDescriptor.java:107)
	at org.junit.jupiter.engine.descriptor.TestMethodTestDescriptor.prepare(TestMethodTestDescriptor.java:71)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$prepare$1(NodeTestTask.java:107)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.prepare(NodeTestTask.java:107)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.execute(NodeTestTask.java:75)
	at java.base/java.util.ArrayList.forEach(ArrayList.java:1510)
	at org.junit.platform.engine.support.hierarchical.SameThreadHierarchicalTestExecutorService.invokeAll(SameThreadHierarchicalTestExecutorService.java:38)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$5(NodeTestTask.java:139)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$7(NodeTestTask.java:125)
	at org.junit.platform.engine.support.hierarchical.Node.around(Node.java:135)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$8(NodeTestTask.java:123)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.executeRecursively(NodeTestTask.java:122)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.execute(NodeTestTask.java:80)
	at java.base/java.util.ArrayList.forEach(ArrayList.java:1510)
	at org.junit.platform.engine.support.hierarchical.SameThreadHierarchicalTestExecutorService.invokeAll(SameThreadHierarchicalTestExecutorService.java:38)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$5(NodeTestTask.java:139)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$7(NodeTestTask.java:125)
	at org.junit.platform.engine.support.hierarchical.Node.around(Node.java:135)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.lambda$executeRecursively$8(NodeTestTask.java:123)
	at org.junit.platform.engine.support.hierarchical.ThrowableCollector.execute(ThrowableCollector.java:73)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.executeRecursively(NodeTestTask.java:122)
	at org.junit.platform.engine.support.hierarchical.NodeTestTask.execute(NodeTestTask.java:80)
	at org.junit.platform.engine.support.hierarchical.SameThreadHierarchicalTestExecutorService.submit(SameThreadHierarchicalTestExecutorService.java:32)
	at org.junit.platform.engine.support.hierarchical.HierarchicalTestExecutor.execute(HierarchicalTestExecutor.java:57)
	at org.junit.platform.engine.support.hierarchical.HierarchicalTestEngine.execute(HierarchicalTestEngine.java:51)
	at org.junit.platform.launcher.core.DefaultLauncher.execute(DefaultLauncher.java:248)
	at org.junit.platform.launcher.core.DefaultLauncher.lambda$execute$5(DefaultLauncher.java:211)
	at org.junit.platform.launcher.core.DefaultLauncher.withInterceptedStreams(DefaultLauncher.java:226)
	at org.junit.platform.launcher.core.DefaultLauncher.execute(DefaultLauncher.java:199)
	at org.junit.platform.launcher.core.DefaultLauncher.execute(DefaultLauncher.java:132)
	at org.gradle.api.internal.tasks.testing.junitplatform.JUnitPlatformTestClassProcessor$CollectAllTestClassesExecutor.processAllTestClasses(JUnitPlatformTestClassProcessor.java:99)
	at org.gradle.api.internal.tasks.testing.junitplatform.JUnitPlatformTestClassProcessor$CollectAllTestClassesExecutor.access$000(JUnitPlatformTestClassProcessor.java:79)
	at org.gradle.api.internal.tasks.testing.junitplatform.JUnitPlatformTestClassProcessor.stop(JUnitPlatformTestClassProcessor.java:75)
	at org.gradle.api.internal.tasks.testing.SuiteTestClassProcessor.stop(SuiteTestClassProcessor.java:61)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.base/java.lang.reflect.Method.invoke(Method.java:564)
	at org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:36)
	at org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:24)
	at org.gradle.internal.dispatch.ContextClassLoaderDispatch.dispatch(ContextClassLoaderDispatch.java:33)
	at org.gradle.internal.dispatch.ProxyDispatchAdapter$DispatchingInvocationHandler.invoke(ProxyDispatchAdapter.java:94)
	at com.sun.proxy.$Proxy2.stop(Unknown Source)
	at org.gradle.api.internal.tasks.testing.worker.TestWorker.stop(TestWorker.java:132)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.base/java.lang.reflect.Method.invoke(Method.java:564)
	at org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:36)
	at org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:24)
	at org.gradle.internal.remote.internal.hub.MessageHubBackedObjectConnection$DispatchWrapper.dispatch(MessageHubBackedObjectConnection.java:182)
	at org.gradle.internal.remote.internal.hub.MessageHubBackedObjectConnection$DispatchWrapper.dispatch(MessageHubBackedObjectConnection.java:164)
	at org.gradle.internal.remote.internal.hub.MessageHub$Handler.run(MessageHub.java:413)
	at org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:64)
	at org.gradle.internal.concurrent.ManagedExecutorImpl$1.run(ManagedExecutorImpl.java:48)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(Unknown Source)
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:630)
	at org.gradle.internal.concurrent.ThreadFactoryImpl$ManagedThreadRunnable.run(ThreadFactoryImpl.java:56)
	at java.base/java.lang.Thread.run(Unknown Source)
Caused by: org.springframework.beans.factory.support.BeanDefinitionOverrideException: Invalid bean definition with name 'conversionServicePostProcessor' defined in class path resource [org/springframework/security/config/annotation/web/configuration/WebSecurityConfiguration.class]: Cannot register bean definition [Root bean: class [org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration]; scope=; abstract=false; lazyInit=null; autowireMode=3; dependencyCheck=0; autowireCandidate=true; primary=false; factoryBeanName=null; factoryMethodName=conversionServicePostProcessor; initMethodName=null; destroyMethodName=(inferred); defined in class path resource [org/springframework/security/config/annotation/web/configuration/WebSecurityConfiguration.class]] for bean 'conversionServicePostProcessor': There is already [Root bean: class [org.springframework.security.config.annotation.web.reactive.WebFluxSecurityConfiguration]; scope=; abstract=false; lazyInit=null; autowireMode=3; dependencyCheck=0; autowireCandidate=true; primary=false; factoryBeanName=null; factoryMethodName=conversionServicePostProcessor; initMethodName=null; destroyMethodName=(inferred); defined in class path resource [org/springframework/security/config/annotation/web/reactive/WebFluxSecurityConfiguration.class]] bound.
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.registerBeanDefinition(DefaultListableBeanFactory.java:945)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitionsForBeanMethod(ConfigurationClassBeanDefinitionReader.java:286)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitionsForConfigurationClass(ConfigurationClassBeanDefinitionReader.java:144)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitions(ConfigurationClassBeanDefinitionReader.java:120)
	at org.springframework.context.annotation.ConfigurationClassPostProcessor.processConfigBeanDefinitions(ConfigurationClassPostProcessor.java:331)
	at org.springframework.context.annotation.ConfigurationClassPostProcessor.postProcessBeanDefinitionRegistry(ConfigurationClassPostProcessor.java:236)
	at org.springframework.context.support.PostProcessorRegistrationDelegate.invokeBeanDefinitionRegistryPostProcessors(PostProcessorRegistrationDelegate.java:280)
	at org.springframework.context.support.PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(PostProcessorRegistrationDelegate.java:96)
	at org.springframework.context.support.AbstractApplicationContext.invokeBeanFactoryPostProcessors(AbstractApplicationContext.java:707)
	at org.springframework.context.support.AbstractApplicationContext.refresh(AbstractApplicationContext.java:533)
	at org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext.refresh(ServletWebServerApplicationContext.java:143)
	at org.springframework.boot.SpringApplication.refresh(SpringApplication.java:758)
	at org.springframework.boot.SpringApplication.refresh(SpringApplication.java:750)
	at org.springframework.boot.SpringApplication.refreshContext(SpringApplication.java:397)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:315)
	at org.springframework.boot.test.context.SpringBootContextLoader.loadContext(SpringBootContextLoader.java:120)
	at org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate.loadContextInternal(DefaultCacheAwareContextLoaderDelegate.java:99)
	at org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate.loadContext(DefaultCacheAwareContextLoaderDelegate.java:124)
	... 89 more
```

**Steps to reproduce:**
root `build.gradle`
```
plugins {
    id "org.springframework.boot" version "2.3.4.RELEASE" apply false
}

allprojects {
    apply plugin: 'io.spring.dependency-management'

    repositories {
        jcenter()
        maven { url "https://jitpack.io" }
    }

    dependencyManagement {
        overriddenByDependencies = false

        imports {
            mavenBom 'software.amazon.awssdk:bom:2.15.4'

            mavenBom 'com.amazonaws:aws-java-sdk-bom:1.11.876'

            mavenBom 'org.testcontainers:testcontainers-bom:1.14.3'
        }

        dependencies {
            dependency 'io.projectreactor.tools:blockhound-junit-platform:1.0.4.RELEASE'

            dependency 'org.springframework.security:spring-security-jwt:1.1.1.RELEASE'
            
            dependency 'io.sentry:sentry-spring-boot-starter:3.1.0'

            dependencySet(group: "org.mock-server", version: "5.11.1") {
                entry "mockserver-netty"
                entry "mockserver-client-java"
            }

            dependencySet(group: 'com.github.bsideup.liiklus', version: '0.10.0-rc1') {
                entry 'client'
                entry 'testing'
            }

            dependency 'org.awaitility:awaitility:4.0.3'
        }
    }
}

subprojects {
    apply plugin:'java'

    targetCompatibility = sourceCompatibility = 14

    dependencies {
        testImplementation 'org.junit.jupiter:junit-jupiter-api'
        testImplementation 'org.junit.jupiter:junit-jupiter-params'

        testRuntimeOnly 'org.junit.jupiter:junit-jupiter-engine'
    }

    test {
        environment "SENTRY_DSN", "https://some@localhost/1234"
        environment "SENTRY_STACKTRACE_APP_PACKAGES", "services.vivy"

        useJUnitPlatform()
        jvmArgs '-XX:+AllowRedefinitionToAddDeleteMethods' // blockhound
    }
}
```

`app/build.gradle`

```
plugins {
    id 'java'
    id 'org.springframework.boot'
}

test.testLogging {
    displayGranularity 1
    showStackTraces = true
    exceptionFormat = 'full'
    events "STARTED", "PASSED", "FAILED", "SKIPPED"
    showStandardStreams = false
}

dependencies {
    annotationProcessor 'org.projectlombok:lombok'
    testAnnotationProcessor 'org.projectlombok:lombok'
    compileOnly 'org.projectlombok:lombok'
    testCompileOnly 'org.projectlombok:lombok'

    compile 'io.projectreactor:reactor-tools'

    compile 'software.amazon.awssdk:dynamodb'
    compile 'software.amazon.awssdk:dynamodb-enhanced'
    compile 'software.amazon.awssdk:s3'

    compile 'org.springframework.boot:spring-boot-starter-webflux'
    compile 'org.springframework.boot:spring-boot-starter-actuator'
    compile 'org.springframework.boot:spring-boot-starter-security'
    compile 'org.springframework.boot:spring-boot-starter-validation'

    compile 'org.springframework.security:spring-security-jwt'
    compile "org.springframework.security:spring-security-oauth2-jose"
    compile "org.springframework.security:spring-security-oauth2-resource-server"

    compile 'com.github.bsideup.liiklus:client'

    implementation 'io.sentry:sentry-spring-boot-starter'

    testCompile 'com.amazonaws:aws-java-sdk-dynamodb'
    testCompile 'org.mock-server:mockserver-client-java'
    testCompile 'org.mock-server:mockserver-netty'
    testCompile 'org.springframework.boot:spring-boot-starter-test'
    testCompile 'io.rest-assured:rest-assured'
    testCompile 'org.testcontainers:localstack'
    testCompile 'org.assertj:assertj-core'
    testCompile 'com.github.bsideup.liiklus:testing'
    testCompile 'org.awaitility:awaitility'
    testCompile 'io.projectreactor.tools:blockhound-junit-platform'

    //http://github.com/gradle/gradle/issues/8806 requires platform launcher in test runtime explicitly
    testRuntime 'org.junit.platform:junit-platform-launcher'
}
```

**Actual result:**
Once `io.sentry:sentry-spring-boot-starter` is added to a classpath and there is spring-security `5.3.4.RELEASE` spring context fails to start.

**Expected result:**
Adding `io.sentry:sentry-spring-boot-starter` should not fail loading spring context.

