After upgrade Gradle to 4.10.1 version, Node plugin stopped working. When I run **gradle npm_install** I receive the following output:

```
gradle npm_install --info
Initialized native services in: /home/bruno/.gradle/native
The client will now receive all logging from the daemon (pid: 28355). The daemon log file: /home/bruno/.gradle/daemon/4.10.1/daemon-28355.out.log
Starting 29th build in daemon [uptime: 16 mins 39.111 secs, performance: 99%]
Using 4 worker leases.
Starting Build
Settings evaluated using settings file '/home/bruno/development/private/gradle-springboot-jersey/testwebapp/settings.gradle'.
Projects loaded. Root project using build file '/home/bruno/development/private/gradle-springboot-jersey/testwebapp/build.gradle'.
Included projects: [root project 'testwebapp']

> Configure project :
Evaluating root project 'testwebapp' using build file '/home/bruno/development/private/gradle-springboot-jersey/testwebapp/build.gradle'.
Applying dependency management to configuration 'annotationProcessor' in project 'testwebapp'
Applying dependency management to configuration 'apiElements' in project 'testwebapp'
Applying dependency management to configuration 'archives' in project 'testwebapp'
Applying dependency management to configuration 'bootArchives' in project 'testwebapp'
Applying dependency management to configuration 'compile' in project 'testwebapp'
Applying dependency management to configuration 'compileClasspath' in project 'testwebapp'
Applying dependency management to configuration 'compileOnly' in project 'testwebapp'
Applying dependency management to configuration 'default' in project 'testwebapp'
Applying dependency management to configuration 'implementation' in project 'testwebapp'
Applying dependency management to configuration 'runtime' in project 'testwebapp'
Applying dependency management to configuration 'runtimeClasspath' in project 'testwebapp'
Applying dependency management to configuration 'runtimeElements' in project 'testwebapp'
Applying dependency management to configuration 'runtimeOnly' in project 'testwebapp'
Applying dependency management to configuration 'testAnnotationProcessor' in project 'testwebapp'
Applying dependency management to configuration 'testCompile' in project 'testwebapp'
Applying dependency management to configuration 'testCompileClasspath' in project 'testwebapp'
Applying dependency management to configuration 'testCompileOnly' in project 'testwebapp'
Applying dependency management to configuration 'testImplementation' in project 'testwebapp'
Applying dependency management to configuration 'testRuntime' in project 'testwebapp'
Applying dependency management to configuration 'testRuntimeClasspath' in project 'testwebapp'
Applying dependency management to configuration 'testRuntimeOnly' in project 'testwebapp'
Applying dependency management to configuration 'providedCompile' in project 'testwebapp'
Applying dependency management to configuration 'providedRuntime' in project 'testwebapp'
All projects evaluated.
Selected primary task 'npm_install' from project :
Tasks to be executed: [task ':nodeSetup', task ':npmSetup', task ':npm_install']
:nodeSetup (Thread[Task worker for ':',5,main]) started.

> Task :nodeSetup SKIPPED
Skipping task ':nodeSetup' as task onlyIf is false.
:nodeSetup (Thread[Task worker for ':',5,main]) completed. Took 0.004 secs.
:npmSetup (Thread[Task worker for ':',5,main]) started.

> Task :npmSetup SKIPPED
Skipping task ':npmSetup' as task onlyIf is false.
:npmSetup (Thread[Task worker for ':',5,main]) completed. Took 0.0 secs.
:npm_install (Thread[Task worker for ':',5,main]) started.

> Task :npm_install FAILED
Task ':npm_install' is not up-to-date because:
  Task has not declared any outputs despite executing actions.
Starting process 'command 'npm''. Working directory: /home/bruno/development/private/gradle-springboot-jersey/testwebapp Command: npm install
:npm_install (Thread[Task worker for ':',5,main]) completed. Took 0.003 secs.

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':npm_install'.
> A problem occurred starting process 'command 'npm''

* Try:
Run with --stacktrace option to get the stack trace. Run with --debug option to get more log output. Run with --scan to get full insights.

* Get more help at https://help.gradle.org

BUILD FAILED in 0s
1 actionable task: 1 executed
```

Also after running gradle bootRun I receive the same output.

My builld.gradle file is:

```
buildscript {
	// configurations {
    //     classpath {
    //         exclude group: 'ch.qos.logback', module: 'logback-classic'
	// 		exclude group: 'org.slf4j'
	// 		exclude group: 'log4j', module: 'log4j'
    //     }
    // }
	ext {
		springBootVersion = '2.0.5.RELEASE'
	}
	repositories {
		mavenCentral()
	}
	dependencies {
		classpath("org.springframework.boot:spring-boot-gradle-plugin:${springBootVersion}")
	}
}

plugins {
  id "com.moowork.node" version "1.2.0"
  id "com.moowork.grunt" version "1.2.0"
}

apply plugin: 'java'
apply plugin: 'maven'
apply plugin: 'eclipse-wtp'
apply plugin: 'org.springframework.boot'
apply plugin: 'io.spring.dependency-management'
apply plugin: 'war'

group = 'it'
version = '0.0.1-SNAPSHOT'
sourceCompatibility = 1.8

repositories {
	mavenCentral()
}

configurations {
	providedRuntime
}

dependencies {
	compile('org.springframework.boot:spring-boot-starter-jersey')
	compile('org.mybatis.spring.boot:mybatis-spring-boot-starter:1.3.2')
	compile group: 'org.glassfish.jersey.media', name: 'jersey-media-multipart', version: '2.27'
	compile group: 'org.springframework', name: 'spring-web', version: '5.0.9.RELEASE'
	compile group: 'com.google.guava', name: 'guava', version: '26.0-jre'
	compile group: 'mysql', name: 'mysql-connector-java', version: '8.0.12'
	compile group: 'org.springframework.boot', name: 'spring-boot-devtools', version: '2.0.5.RELEASE'
	compile group: 'org.springframework.boot', name: 'spring-boot-starter-data-rest', version: '2.0.5.RELEASE'
	compile('org.springframework.boot:spring-boot-starter-web')
	compile group: 'org.springframework.boot', name: 'spring-boot-starter-tomcat', version: '2.0.5.RELEASE'
	compile group: 'org.springframework.boot', name: 'spring-boot-starter-thymeleaf', version: '2.0.5.RELEASE'
	compile group: 'org.postgresql', name: 'postgresql', version: '42.2.5'
	providedRuntime('org.springframework.boot:spring-boot-starter-tomcat')
	testCompile('org.springframework.boot:spring-boot-starter-test')
}

bootRun {
	dependsOn 'gruntExec'
}

task gruntExec(type: Exec) {
	dependsOn 'installNpm'
	
	commandLine 'grunt', 'build'
}

task installNpm(type: Exec) {
	commandLine 'npm', 'install'
}
```
Anyone can help me? Thanks for the support
