Here's the output I'm seeing:

```
* What went wrong:
Execution failed for task ':shared:sonarlintMain'.
> This exception is unexpected. Please report it here: https://github.com/remal-gradle-plugins/sonarlint/issues . OS: Mac OS X 15.7.1 aarch64. Local time: 08:42:33.457652. An exception occurred while calling for an RMI method name.remal.gradle_plugins.sonarlint.internal.server.api.SonarLintAnalyzer.analyze(name.remal.gradle_plugins.sonarlint.internal.server.api.SonarLintAnalyzeParams,name.remal.gradle_plugins.sonarlint.internal.server.api.SonarLintLogSink).
  State: Started
  Client Java version: 21
  Client logs:
    08:42:33.204 [Execution worker Thread 2] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Changing state to SonarLintClientState.Starting(serverProcess=null, startedSignal=java.util.concurrent.CountDownLatch@7b584b1d[Count = 1]) from CLIENT_CREATED
    08:42:33.205 [Execution worker Thread 2] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Creating SonarLintClient RMI registry at localhost/127.0.0.1 on any available port
    08:42:33.206 [Execution worker Thread 2] INFO name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - SonarLintClient RMI registry created at localhost/127.0.0.1:64945
    08:42:33.208 [Execution worker Thread 2] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Exporting an SonarLintClient RMI stub of interface name.remal.gradle_plugins.sonarlint.internal.client.api.SonarLintServerRuntimeInfo at localhost/127.0.0.1 on any available port
    08:42:33.208 [Execution worker Thread 2] INFO name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Exported an SonarLintClient RMI stub of interface name.remal.gradle_plugins.sonarlint.internal.client.api.SonarLintServerRuntimeInfo at localhost/127.0.0.1 on port 64946
    08:42:33.422 [RMI TCP Connection(2)-127.0.0.1] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Reported server socket address: localhost/127.0.0.1:64949
    08:42:33.422 [RMI TCP Connection(2)-127.0.0.1] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Connecting to SonarLintServerMain RMI registry at localhost/127.0.0.1:64949
    08:42:33.422 [RMI TCP Connection(2)-127.0.0.1] INFO name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Connected to SonarLintServerMain RMI registry at localhost/127.0.0.1:64949
    08:42:33.423 [RMI TCP Connection(2)-127.0.0.1] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Changing state to SonarLintClientState.Started(serverRegistry=ClientRegistryFacade[registryName=SonarLintServerMain, socketAddress=localhost/127.0.0.1:64949], serverProcess=JavaExecDefault.JavaExecProcessDefault(commandLineArgumentFile=/var/folders/yl/d2rj8tb95nn2qwnyf40yvnxh0000gp/T/JavaExecDefault-17126276172973741806.arg, process=Process[pid=76868, exitValue="not exited"], outputFile=/var/folders/yl/d2rj8tb95nn2qwnyf40yvnxh0000gp/T/JavaExecDefault-10843958681585579718.log)) from SonarLintClientState.Starting(serverProcess=JavaExecDefault.JavaExecProcessDefault(commandLineArgumentFile=/var/folders/yl/d2rj8tb95nn2qwnyf40yvnxh0000gp/T/JavaExecDefault-17126276172973741806.arg, process=Process[pid=76868, exitValue="not exited"], outputFile=/var/folders/yl/d2rj8tb95nn2qwnyf40yvnxh0000gp/T/JavaExecDefault-10843958681585579718.log), startedSignal=java.util.concurrent.CountDownLatch@7b584b1d[Count = 1])
    08:42:33.423 [Execution worker Thread 2] DEBUG name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Looking up for a stub of interface name.remal.gradle_plugins.sonarlint.internal.server.api.SonarLintAnalyzer from SonarLintServerMain RMI registry (localhost/127.0.0.1:64949)
    08:42:33.431 [Execution worker Thread 2] INFO name.remal.gradle_plugins.sonarlint.internal.client.SonarLintClient - Retrieved a stub of interface name.remal.gradle_plugins.sonarlint.internal.server.api.SonarLintAnalyzer from SonarLintServerMain RMI registry (localhost/127.0.0.1:64949)
  Server Java version: 21
  Server pid: 76868
  Server logs file: /var/folders/yl/d2rj8tb95nn2qwnyf40yvnxh0000gp/T/JavaExecDefault-10843958681585579718.log
  Server logs:
    SLF4J(W): No SLF4J providers were found.
    SLF4J(W): Defaulting to no-operation (NOP) logger implementation
    SLF4J(W): See https://www.slf4j.org/codes.html#noProviders for further details.
    SLF4J(W): Class path contains SLF4J bindings targeting slf4j-api versions 1.7.x or earlier.
    SLF4J(W): Ignoring binding found at [jar:file:/Users/anracel/.gradle/caches/modules-2/files-2.1/org.slf4j/slf4j-simple/1.7.36/a41f9cfe6faafb2eb83a1c7dd2d0dfd844e2a936/slf4j-simple-1.7.36.jar!/org/slf4j/impl/StaticLoggerBinder.class]
    SLF4J(W): See https://www.slf4j.org/codes.html#ignoredBindings for an explanation.

```
