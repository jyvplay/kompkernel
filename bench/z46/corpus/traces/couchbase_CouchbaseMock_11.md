When I trying to connect to CouchbaseMock in my porject, TimeoutException occurs. I can find Couchbase client trying to connect to 11210port . But CouchbaseMock do not seems to open 11210 port  (I check with `netstat -an | grep LISTEN`) Is there the way to use CouchbaseMock with lastest version of java sdk?

Code (I embeded CouchbaseMock on my project):

```
BucketConfiguration bucketConfiguration = new BucketConfiguration();
bucketConfiguration.numNodes = 10;
bucketConfiguration.numReplicas = 3;
bucketConfiguration.name = "default";
bucketConfiguration.type = Bucket.BucketType.COUCHBASE;
bucketConfiguration.password = "";

ArrayList<BucketConfiguration> configList = new ArrayList<>();
configList.add(bucketConfiguration);
CouchbaseMock couchbaseMock = new CouchbaseMock(0, configList);
couchbaseMock.start();
couchbaseMock.waitForStartup();


MockClient mockClient = new MockClient(new InetSocketAddress("localhost", 8092));
couchbaseMock.startHarakiriMonitor("localhost:" + mockClient.getPort(), false);
mockClient.negotiate();

DefaultCouchbaseEnvironment env = DefaultCouchbaseEnvironment.builder().build();
CouchbaseCluster cluster = CouchbaseCluster.create(env, Lists.newArrayList("127.0.0.1"));

// TimeoutException occurs on following statement:
cluster.openBucket("bucket");
```

StackTrance of the exception:

```
Exception in thread "main" java.lang.RuntimeException: java.util.concurrent.TimeoutException
    at com.couchbase.client.java.util.Blocking.blockForSingle(Blocking.java:93)
    at com.couchbase.client.java.CouchbaseCluster.openBucket(CouchbaseCluster.java:108)
    at com.couchbase.client.java.CouchbaseCluster.openBucket(CouchbaseCluster.java:99)
    at com.couchbase.client.java.CouchbaseCluster.openBucket(CouchbaseCluster.java:89)
    at com.couchbase.client.java.CouchbaseCluster.openBucket(CouchbaseCluster.java:79)
    at kr.co.vcnc.fearow.CouchbaseMockMain.main(CouchbaseMockMain.java:52)
Caused by: java.util.concurrent.TimeoutException
    ... 6 more
```

StackTrace that logged by couchbase-client:

```
[WARN][Endpoint][cb-io-1-1] [null][KeyValueEndpoint]: Could not connect to endpoint, retrying with delay 32 MILLISECONDS: 
java.net.ConnectException: Connection refused: localhost/127.0.0.1:11210
    at sun.nio.ch.SocketChannelImpl.checkConnect(Native Method)
    at sun.nio.ch.SocketChannelImpl.finishConnect(SocketChannelImpl.java:716)
    at com.couchbase.client.deps.io.netty.channel.socket.nio.NioSocketChannel.doFinishConnect(NioSocketChannel.java:208)
    at com.couchbase.client.deps.io.netty.channel.nio.AbstractNioChannel$AbstractNioUnsafe.finishConnect(AbstractNioChannel.java:281)
    at com.couchbase.client.deps.io.netty.channel.nio.NioEventLoop.processSelectedKey(NioEventLoop.java:528)
    at com.couchbase.client.deps.io.netty.channel.nio.NioEventLoop.processSelectedKeysOptimized(NioEventLoop.java:468)
    at com.couchbase.client.deps.io.netty.channel.nio.NioEventLoop.processSelectedKeys(NioEventLoop.java:382)
    at com.couchbase.client.deps.io.netty.channel.nio.NioEventLoop.run(NioEventLoop.java:354)
    at com.couchbase.client.deps.io.netty.util.concurrent.SingleThreadEventExecutor$2.run(SingleThreadEventExecutor.java:116)
    at com.couchbase.client.deps.io.netty.util.concurrent.DefaultThreadFactory$DefaultRunnableDecorator.run(DefaultThreadFactory.java:137)
    at java.lang.Thread.run(Thread.java:745)
```

i sumit this issue on [Couchbase forum](https://forums.couchbase.com/t/timeoutexception-when-try-to-open-bucket-of-couchbasemock/3595/1), but I also create issue on the repo.

