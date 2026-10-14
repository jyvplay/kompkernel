`WARNING: All illegal access operations will be denied in a future release

app.persistence.repository.auth.UserRepositoryTest > testSaveUserWithRole FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.persistence.repository.cms.PageRepositoryTest > testSubpages FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.persistence.repository.cms.PageRepositoryTest > testCreatePage FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.front.controller.HomepageMockTest > shouldReturnDefaultMessage FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.front.controller.SmokeTest > contextLoads FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

7 tests completed, 5 failed

> Task :test FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':test'.
> There were failing tests. See the report at: file:///home/polito/IdeaProjects/privat/cms-boot/build/reports/tests/test/index.html

* Try:
Run with --stacktrace option to get the stack trace. Run with --info or --debug option to get more log output. Run with --scan to get full insights.

* Get more help at https://help.gradle.org

Deprecated Gradle features were used in this build, making it incompatible with Gradle 5.0.
See https://docs.gradle.org/4.8/userguide/command_line_interface.html#sec:command_line_warnings

BUILD FAILED in 41s
5 actionable tasks: 4 executed, 1 up-to-date
polito@polito:~/IdeaProjects/privat/cms-boot$ ./gradlew build --stacktrace

> Task :test
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by org.springframework.cglib.core.ReflectUtils$1 (file:/home/polito/.gradle/caches/modules-2/files-2.1/org.springframework/spring-core/5.0.7.RELEASE/54b731178d81e66eca9623df772ff32718208137/spring-core-5.0.7.RELEASE.jar) to method java.lang.ClassLoader.defineClass(java.lang.String,byte[],int,int,java.security.ProtectionDomain)
WARNING: Please consider reporting this to the maintainers of org.springframework.cglib.core.ReflectUtils$1
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release

app.persistence.repository.auth.UserRepositoryTest > testSaveUserWithRole FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.persistence.repository.cms.PageRepositoryTest > testSubpages FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.persistence.repository.cms.PageRepositoryTest > testCreatePage FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.front.controller.HomepageMockTest > shouldReturnDefaultMessage FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

app.front.controller.SmokeTest > contextLoads FAILED
    java.lang.IllegalStateException
        Caused by: org.springframework.beans.factory.BeanCreationException
            Caused by: java.lang.NoClassDefFoundError
                Caused by: java.lang.ClassNotFoundException

7 tests completed, 5 failed

> Task :test FAILED

FAILURE: Build failed with an exception.

* What went wrong:
Execution failed for task ':test'.
> There were failing tests. See the report at: file:///home/polito/IdeaProjects/privat/cms-boot/build/reports/tests/test/index.html

* Try:
Run with --info or --debug option to get more log output. Run with --scan to get full insights.

* Exception is:
org.gradle.api.tasks.TaskExecutionException: Execution failed for task ':test'.
        at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.executeActions(ExecuteActionsTaskExecuter.java:110)
        at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.execute(ExecuteActionsTaskExecuter.java:77)
        at org.gradle.api.internal.tasks.execution.OutputDirectoryCreatingTaskExecuter.execute(OutputDirectoryCreatingTaskExecuter.java:51)
        at org.gradle.api.internal.tasks.execution.SkipUpToDateTaskExecuter.execute(SkipUpToDateTaskExecuter.java:59)
        at org.gradle.api.internal.tasks.execution.ResolveTaskOutputCachingStateExecuter.execute(ResolveTaskOutputCachingStateExecuter.java:54)
        at org.gradle.api.internal.tasks.execution.ValidatingTaskExecuter.execute(ValidatingTaskExecuter.java:59)
        at org.gradle.api.internal.tasks.execution.SkipEmptySourceFilesTaskExecuter.execute(SkipEmptySourceFilesTaskExecuter.java:101)
        at org.gradle.api.internal.tasks.execution.FinalizeInputFilePropertiesTaskExecuter.execute(FinalizeInputFilePropertiesTaskExecuter.java:44)
        at org.gradle.api.internal.tasks.execution.CleanupStaleOutputsExecuter.execute(CleanupStaleOutputsExecuter.java:91)
        at org.gradle.api.internal.tasks.execution.ResolveTaskArtifactStateTaskExecuter.execute(ResolveTaskArtifactStateTaskExecuter.java:62)
        at org.gradle.api.internal.tasks.execution.SkipTaskWithNoActionsExecuter.execute(SkipTaskWithNoActionsExecuter.java:59)
        at org.gradle.api.internal.tasks.execution.SkipOnlyIfTaskExecuter.execute(SkipOnlyIfTaskExecuter.java:54)
        at org.gradle.api.internal.tasks.execution.ExecuteAtMostOnceTaskExecuter.execute(ExecuteAtMostOnceTaskExecuter.java:43)
        at org.gradle.api.internal.tasks.execution.CatchExceptionTaskExecuter.execute(CatchExceptionTaskExecuter.java:34)
        at org.gradle.api.internal.tasks.execution.EventFiringTaskExecuter$1.run(EventFiringTaskExecuter.java:51)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor$RunnableBuildOperationWorker.execute(DefaultBuildOperationExecutor.java:317)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor$RunnableBuildOperationWorker.execute(DefaultBuildOperationExecutor.java:309)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor.execute(DefaultBuildOperationExecutor.java:185)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor.run(DefaultBuildOperationExecutor.java:97)
        at org.gradle.internal.operations.DelegatingBuildOperationExecutor.run(DelegatingBuildOperationExecutor.java:31)
        at org.gradle.api.internal.tasks.execution.EventFiringTaskExecuter.execute(EventFiringTaskExecuter.java:46)
        at org.gradle.execution.taskgraph.DefaultTaskExecutionGraph$ExecuteTaskAction.execute(DefaultTaskExecutionGraph.java:262)
        at org.gradle.execution.taskgraph.DefaultTaskExecutionGraph$ExecuteTaskAction.execute(DefaultTaskExecutionGraph.java:246)
        at org.gradle.execution.taskgraph.DefaultTaskPlanExecutor$TaskExecutorWorker$1.execute(DefaultTaskPlanExecutor.java:136)
        at org.gradle.execution.taskgraph.DefaultTaskPlanExecutor$TaskExecutorWorker$1.execute(DefaultTaskPlanExecutor.java:130)
        at org.gradle.execution.taskgraph.DefaultTaskPlanExecutor$TaskExecutorWorker.execute(DefaultTaskPlanExecutor.java:201)
        at org.gradle.execution.taskgraph.DefaultTaskPlanExecutor$TaskExecutorWorker.executeWithTask(DefaultTaskPlanExecutor.java:192)
        at org.gradle.execution.taskgraph.DefaultTaskPlanExecutor$TaskExecutorWorker.run(DefaultTaskPlanExecutor.java:130)
        at org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:63)
        at org.gradle.internal.concurrent.ManagedExecutorImpl$1.run(ManagedExecutorImpl.java:46)
        at org.gradle.internal.concurrent.ThreadFactoryImpl$ManagedThreadRunnable.run(ThreadFactoryImpl.java:55)
Caused by: org.gradle.api.GradleException: There were failing tests. See the report at: file:///home/polito/IdeaProjects/privat/cms-boot/build/reports/tests/test/index.html
        at org.gradle.api.tasks.testing.AbstractTestTask.handleTestFailures(AbstractTestTask.java:612)
        at org.gradle.api.tasks.testing.AbstractTestTask.executeTests(AbstractTestTask.java:484)
        at org.gradle.api.tasks.testing.Test.executeTests(Test.java:603)
        at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
        at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:62)
        at java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)
        at org.gradle.internal.reflect.JavaMethod.invoke(JavaMethod.java:73)
        at org.gradle.api.internal.project.taskfactory.StandardTaskAction.doExecute(StandardTaskAction.java:46)
        at org.gradle.api.internal.project.taskfactory.StandardTaskAction.execute(StandardTaskAction.java:39)
        at org.gradle.api.internal.project.taskfactory.StandardTaskAction.execute(StandardTaskAction.java:26)
        at org.gradle.api.internal.AbstractTask$TaskActionWrapper.execute(AbstractTask.java:794)
        at org.gradle.api.internal.AbstractTask$TaskActionWrapper.execute(AbstractTask.java:761)
        at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter$1.run(ExecuteActionsTaskExecuter.java:131)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor$RunnableBuildOperationWorker.execute(DefaultBuildOperationExecutor.java:317)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor$RunnableBuildOperationWorker.execute(DefaultBuildOperationExecutor.java:309)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor.execute(DefaultBuildOperationExecutor.java:185)
        at org.gradle.internal.operations.DefaultBuildOperationExecutor.run(DefaultBuildOperationExecutor.java:97)
        at org.gradle.internal.operations.DelegatingBuildOperationExecutor.run(DelegatingBuildOperationExecutor.java:31)
        at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.executeAction(ExecuteActionsTaskExecuter.java:120)
        at org.gradle.api.internal.tasks.execution.ExecuteActionsTaskExecuter.executeActions(ExecuteActionsTaskExecuter.java:99)
        ... 30 more

`

building with standard ubuntu 19.10
