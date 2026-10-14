# BeforeSuite {Kubernetes e2e suite}

**@k8s-github-robot** opened on 2016-09-23T18:37:48Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gce-scalability/10992/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:158
Sep 23 11:26:08.874: Error waiting for all pods to be running and ready: 1 / 418 pods in namespace "kube-system" are NOT in the desired state in 10m0s
POD                              NODE                              PHASE   GRACE CONDITIONS
node-problem-detector-v0.1-dwpq2 e2e-scalability-minion-group-i5cw Pending       [{Initialized True 0001-01-01 00:00:00 +0000 UTC 2016-09-23 11:12:13 -0700 PDT  } {Ready False 0001-01-01 00:00:00 +0000 UTC 2016-09-23 11:12:13 -0700 PDT ContainersNotReady containers with unready status: [node-problem-detector]} {PodScheduled True 0001-01-01 00:00:00 +0000 UTC 2016-09-23 11:16:54 -0700 PDT  }]

/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:128
```

Previous issues for this test: #26135 #26236 #27920 #28492 #29970 #30075 #32980 #33313



---
**@k8s-github-robot** commented on 2016-09-23T22:45:17Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-release-1.4/202/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
BeforeSuite on Node 1 failed
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
```


---
**@k8s-github-robot** commented on 2016-09-23T23:51:26Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-release-1.4/204/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
BeforeSuite on Node 1 failed
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
```


---
**@k8s-github-robot** commented on 2016-09-24T00:41:42Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-scalability-release-1.4/16/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
Sep 23 17:30:48.323: Error waiting for all pods to be running and ready: Not all pods in namespace "kube-system" are successful within 10m0s
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:124
```


---
**@k8s-github-robot** commented on 2016-09-24T01:01:51Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-alpha-features-release-1.4/57/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
Sep 23 17:51:02.672: Error waiting for all pods to be running and ready: Not all pods in namespace "kube-system" are successful within 10m0s
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:124
```


---
**@k8s-github-robot** commented on 2016-09-24T01:12:10Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-reboot-release-1.4/169/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
Sep 23 18:00:51.612: Error waiting for all pods to be running and ready: Not all pods in namespace "kube-system" are successful within 10m0s
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:124
```


---
**@k8s-github-robot** commented on 2016-09-24T01:22:10Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-scalability-release-1.4/17/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
Sep 23 18:05:33.338: Error waiting for all pods to be running and ready: Not all pods in namespace "kube-system" are successful within 10m0s
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:124
```


---
**@k8s-github-robot** commented on 2016-09-24T03:02:40Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce-scalability-release-1.4/18/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:154
Sep 23 19:47:14.023: Error waiting for all pods to be running and ready: Not all pods in namespace "kube-system" are successful within 10m0s
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:124
```


---
**@k8s-github-robot** commented on 2016-09-24T04:22:40Z

https://k8s-gubernator.appspot.com/build/kubernetes-jenkins/logs/kubernetes-e2e-gci-gce/235/

Failed: BeforeSuite {Kubernetes e2e suite}

```
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:158
BeforeSuite on Node 1 failed
/go/src/k8s.io/kubernetes/_output/dockerized/go/src/k8s.io/kubernetes/test/e2e/e2e.go:158
```

