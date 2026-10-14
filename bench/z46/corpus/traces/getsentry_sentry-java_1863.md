_Platform:_
- [v]  Java -> 17 (sourceCompatibility/targetCompatibility as well)
- [v]  Spring -> spring-boot:2.4.5

_Build system:_
- [v]  Bazel ->  6.0.0-pre.20211215.3 / rules_jvm_external 4.2

The version of the SDK:
**5.5.1**

---
I have the following issue:

When using `io.sentry:sentry-spring-boot-starter` as runtime deps on spring boot **batch** application, which has also a web endpoint (using , the spring boot application fails to start. See the stacktrace at the bottom.

The error says `org.springframework.web.servlet.HandlerExceptionResolver` is undefined. I see  `io.sentry:sentry-spring` without having dependency to `org.springframework:spring-webmvc`directly - maybe that's the issue?

When I add `org.springframework:spring-webmvc` or `org.springframework.boot:spring-boot-starter-web` as runtime dep, it does not happen.

Also when I remove `io.sentry:sentry-spring-boot-starter` from the runtime dep, it does not happen.

**Steps to reproduce:**

Sorry, don't have time to make a minimal reproducible project for this. 

**Actual result:**

```
java.lang.IllegalStateException: Error processing condition on io.sentry.spring.boot.SentryAutoConfiguration$HubConfiguration$SentryWebMvcConfiguration.sentryTracingFilter
	at org.springframework.boot.autoconfigure.condition.SpringBootCondition.matches(SpringBootCondition.java:60)
	at org.springframework.context.annotation.ConditionEvaluator.shouldSkip(ConditionEvaluator.java:108)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitionsForBeanMethod(ConfigurationClassBeanDefinitionReader.java:193)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitionsForConfigurationClass(ConfigurationClassBeanDefinitionReader.java:153)
	at org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader.loadBeanDefinitions(ConfigurationClassBeanDefinitionReader.java:129)
	at org.springframework.context.annotation.ConfigurationClassPostProcessor.processConfigBeanDefinitions(ConfigurationClassPostProcessor.java:343)
	at org.springframework.context.annotation.ConfigurationClassPostProcessor.postProcessBeanDefinitionRegistry(ConfigurationClassPostProcessor.java:247)
	at org.springframework.context.support.PostProcessorRegistrationDelegate.invokeBeanDefinitionRegistryPostProcessors(PostProcessorRegistrationDelegate.java:311)
	at org.springframework.context.support.PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(PostProcessorRegistrationDelegate.java:112)
	at org.springframework.context.support.AbstractApplicationContext.invokeBeanFactoryPostProcessors(AbstractApplicationContext.java:746)
	at org.springframework.context.support.AbstractApplicationContext.refresh(AbstractApplicationContext.java:564)
	at org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext.refresh(ServletWebServerApplicationContext.java:144)
	at org.springframework.boot.SpringApplication.refresh(SpringApplication.java:782)
	at org.springframework.boot.SpringApplication.refresh(SpringApplication.java:774)
	at org.springframework.boot.SpringApplication.refreshContext(SpringApplication.java:439)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:339)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1340)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1329)
	at ---
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.base/java.lang.reflect.Method.invoke(Method.java:568)
	at org.springframework.boot.loader.MainMethodRunner.run(MainMethodRunner.java:49)
	at org.springframework.boot.loader.Launcher.launch(Launcher.java:108)
	at org.springframework.boot.loader.Launcher.launch(Launcher.java:58)
	at org.springframework.boot.loader.JarLauncher.main(JarLauncher.java:88)
Caused by: java.lang.IllegalStateException: Failed to introspect Class [io.sentry.spring.boot.SentryAutoConfiguration$HubConfiguration$SentryWebMvcConfiguration] from ClassLoader [org.springframework.boot.loader.LaunchedURLClassLoader@72725ee1]
	at org.springframework.util.ReflectionUtils.getDeclaredMethods(ReflectionUtils.java:481)
	at org.springframework.util.ReflectionUtils.doWithMethods(ReflectionUtils.java:358)
	at org.springframework.util.ReflectionUtils.getUniqueDeclaredMethods(ReflectionUtils.java:414)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.lambda$getTypeForFactoryMethod$2(AbstractAutowireCapableBeanFactory.java:747)
	at java.base/java.util.concurrent.ConcurrentHashMap.computeIfAbsent(ConcurrentHashMap.java:1708)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.getTypeForFactoryMethod(AbstractAutowireCapableBeanFactory.java:746)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.determineTargetType(AbstractAutowireCapableBeanFactory.java:685)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.predictBeanType(AbstractAutowireCapableBeanFactory.java:656)
	at org.springframework.beans.factory.support.AbstractBeanFactory.isFactoryBean(AbstractBeanFactory.java:1670)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.doGetBeanNamesForType(DefaultListableBeanFactory.java:570)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBeanNamesForType(DefaultListableBeanFactory.java:542)
	at org.springframework.boot.autoconfigure.condition.OnBeanCondition.collectBeanNamesForType(OnBeanCondition.java:238)
	at org.springframework.boot.autoconfigure.condition.OnBeanCondition.getBeanNamesForType(OnBeanCondition.java:231)
	at org.springframework.boot.autoconfigure.condition.OnBeanCondition.getBeanNamesForType(OnBeanCondition.java:221)
	at org.springframework.boot.autoconfigure.condition.OnBeanCondition.getMatchingBeans(OnBeanCondition.java:169)
	at org.springframework.boot.autoconfigure.condition.OnBeanCondition.getMatchOutcome(OnBeanCondition.java:119)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition$MemberOutcomes.getConditionOutcome(AbstractNestedCondition.java:194)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition$MemberOutcomes.<init>(AbstractNestedCondition.java:188)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition$MemberConditions.lambda$getMatchOutcomes$0(AbstractNestedCondition.java:168)
	at java.base/java.util.Map.forEach(Map.java:713)
	at java.base/java.util.Collections$UnmodifiableMap.forEach(Collections.java:1553)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition$MemberConditions.getMatchOutcomes(AbstractNestedCondition.java:168)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition$MemberMatchOutcomes.<init>(AbstractNestedCondition.java:78)
	at org.springframework.boot.autoconfigure.condition.AbstractNestedCondition.getMatchOutcome(AbstractNestedCondition.java:63)
	at org.springframework.boot.autoconfigure.condition.SpringBootCondition.matches(SpringBootCondition.java:47)
	... 26 common frames omitted
Caused by: java.lang.NoClassDefFoundError: org/springframework/web/servlet/HandlerExceptionResolver
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:1012)
	at java.base/java.security.SecureClassLoader.defineClass(SecureClassLoader.java:150)
	at java.base/java.net.URLClassLoader.defineClass(URLClassLoader.java:524)
	at java.base/java.net.URLClassLoader$1.run(URLClassLoader.java:427)
	at java.base/java.net.URLClassLoader$1.run(URLClassLoader.java:421)
	at java.base/java.security.AccessController.doPrivileged(AccessController.java:712)
	at java.base/java.net.URLClassLoader.findClass(URLClassLoader.java:420)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:587)
	at org.springframework.boot.loader.LaunchedURLClassLoader.loadClass(LaunchedURLClassLoader.java:151)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:520)
	at java.base/java.lang.Class.getDeclaredMethods0(Native Method)
	at java.base/java.lang.Class.privateGetDeclaredMethods(Class.java:3402)
	at java.base/java.lang.Class.getDeclaredMethods(Class.java:2504)
	at org.springframework.util.ReflectionUtils.getDeclaredMethods(ReflectionUtils.java:463)
	... 50 common frames omitted
Caused by: java.lang.ClassNotFoundException: org.springframework.web.servlet.HandlerExceptionResolver
	at java.base/java.net.URLClassLoader.findClass(URLClassLoader.java:445)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:587)
	at org.springframework.boot.loader.LaunchedURLClassLoader.loadClass(LaunchedURLClassLoader.java:151)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:520)
	... 65 common frames omitted

java.lang.IllegalStateException: Failed to introspect Class [io.sentry.spring.boot.SentryAutoConfiguration$HubConfiguration$SentryWebMvcConfiguration] from ClassLoader [org.springframework.boot.loader.LaunchedURLClassLoader@72725ee1]
	at org.springframework.util.ReflectionUtils.getDeclaredMethods(ReflectionUtils.java:481)
	at org.springframework.util.ReflectionUtils.doWithMethods(ReflectionUtils.java:358)
	at org.springframework.util.ReflectionUtils.getUniqueDeclaredMethods(ReflectionUtils.java:414)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.lambda$getTypeForFactoryMethod$2(AbstractAutowireCapableBeanFactory.java:747)
	at java.base/java.util.concurrent.ConcurrentHashMap.computeIfAbsent(ConcurrentHashMap.java:1708)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.getTypeForFactoryMethod(AbstractAutowireCapableBeanFactory.java:746)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.determineTargetType(AbstractAutowireCapableBeanFactory.java:685)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.predictBeanType(AbstractAutowireCapableBeanFactory.java:656)
	at org.springframework.beans.factory.support.AbstractBeanFactory.isFactoryBean(AbstractBeanFactory.java:1670)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.doGetBeanNamesForType(DefaultListableBeanFactory.java:570)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBeanNamesForType(DefaultListableBeanFactory.java:542)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBeansOfType(DefaultListableBeanFactory.java:667)
	at org.springframework.beans.factory.support.DefaultListableBeanFactory.getBeansOfType(DefaultListableBeanFactory.java:659)
	at org.springframework.context.support.AbstractApplicationContext.getBeansOfType(AbstractApplicationContext.java:1300)
	at org.springframework.boot.SpringApplication.getExitCodeFromMappedException(SpringApplication.java:914)
	at org.springframework.boot.SpringApplication.getExitCodeFromException(SpringApplication.java:902)
	at org.springframework.boot.SpringApplication.handleExitCode(SpringApplication.java:889)
	at org.springframework.boot.SpringApplication.handleRunFailure(SpringApplication.java:830)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:349)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1340)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1329)
	at ---
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
	at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)
	at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
	at java.base/java.lang.reflect.Method.invoke(Method.java:568)
	at org.springframework.boot.loader.MainMethodRunner.run(MainMethodRunner.java:49)
	at org.springframework.boot.loader.Launcher.launch(Launcher.java:108)
	at org.springframework.boot.loader.Launcher.launch(Launcher.java:58)
	at org.springframework.boot.loader.JarLauncher.main(JarLauncher.java:88)
Caused by: java.lang.NoClassDefFoundError: org/springframework/web/servlet/HandlerExceptionResolver
	at java.base/java.lang.ClassLoader.defineClass1(Native Method)
	at java.base/java.lang.ClassLoader.defineClass(ClassLoader.java:1012)
	at java.base/java.security.SecureClassLoader.defineClass(SecureClassLoader.java:150)
	at java.base/java.net.URLClassLoader.defineClass(URLClassLoader.java:524)
	at java.base/java.net.URLClassLoader$1.run(URLClassLoader.java:427)
	at java.base/java.net.URLClassLoader$1.run(URLClassLoader.java:421)
	at java.base/java.security.AccessController.doPrivileged(AccessController.java:712)
	at java.base/java.net.URLClassLoader.findClass(URLClassLoader.java:420)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:587)
	at org.springframework.boot.loader.LaunchedURLClassLoader.loadClass(LaunchedURLClassLoader.java:151)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:520)
	at java.base/java.lang.Class.getDeclaredMethods0(Native Method)
	at java.base/java.lang.Class.privateGetDeclaredMethods(Class.java:3402)
	at java.base/java.lang.Class.getDeclaredMethods(Class.java:2504)
	at org.springframework.util.ReflectionUtils.getDeclaredMethods(ReflectionUtils.java:463)
	... 29 common frames omitted
Caused by: java.lang.ClassNotFoundException: org.springframework.web.servlet.HandlerExceptionResolver
	at java.base/java.net.URLClassLoader.findClass(URLClassLoader.java:445)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:587)
	at org.springframework.boot.loader.LaunchedURLClassLoader.loadClass(LaunchedURLClassLoader.java:151)
	at java.base/java.lang.ClassLoader.loadClass(ClassLoader.java:520)
	... 44 common frames omitted
```

**Expected result:**
- Result

