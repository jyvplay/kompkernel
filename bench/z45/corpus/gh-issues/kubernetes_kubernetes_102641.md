# owned Custom Resources not garbage collected after CRD API version removal

**@irbekrm** opened on 2021-06-06T18:54:44Z

<!-- Please use this template while reporting a bug and provide as much info as possible. Not doing so may result in your bug not being addressed in a timely manner. Thanks!

If the matter is security related, please disclose it privately via https://kubernetes.io/security/
-->


#### What happened:

We are trying to deprecate and remove some CRD API versions and as part of that to ensure that users who have originally deployed Custom Resources at the legacy versions can upgrade.
For a Custom Resource X that is a dependent on another Custom Resource Y and they both have been originally created using a legacy API version `v1alpha2`, we observe that after an upgrade to a controller version where `v1alpha2` is no longer served, X is not garbage collected after Y has been deleted.

X after the upgrade:
```
apiVersion: cert-manager.io/v1
kind: CertificateRequest
metadata:
  annotations:
    cert-manager.io/certificate-name: test1
...
name: test1-4d8sc
  namespace: default
  ownerReferences:
  - apiVersion: cert-manager.io/v1alpha2
    blockOwnerDeletion: true
    controller: true
    kind: Certificate
    name: test1
    uid: a20001e7-4793-42bf-955a-a6216cbdc933
...
```

Y after the upgrade:
```
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
...
  name: test1
  namespace: default
  resourceVersion: "12276"
  uid: a20001e7-4793-42bf-955a-a6216cbdc933
```

In the above config `CertificateRequest.metadata.ownerReferences[0].apiVersion` is incorrect. I thought that perhaps this is the issue, so I tried editing it `v1alpha2` -> `v1` just before running the delete command. The edited `CertificateRequest` was still not deleted.
Does the `metadata.ownerReferences[0].apiVersion` matter- I seem to remember seeing somewhere on #sig-api-machinery Slack that it is not actually used?

#### What you expected to happen:

I expected that X would be deleted after Y is deleted as it happens normally with these resources.

#### How to reproduce it (as minimally and precisely as possible):
1. Deploy `cert-manager` version `v0.16` where the storage version for all CRDs is `v1alpha2`
2. Create an `Certificate` (Y) Custom Resource using the `v1alpha2` API. A `CertificateRequest` X will be created for Y with Y set as X's owner reference.
3. Upgrade to a newer version of `cert-manager` where the only storage version is `v1` (`v1alpha2` is still being served)
4. Upgrade stored versions of Custom Resources and `status.storedVersions` of CRDs as described in Kubernetes docs [here](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/#upgrade-existing-objects-to-a-new-stored-version)
5. Upgrade to a version of `cert-manager` where `v1` is the only served version
6. Delete Y `kubectl delete certificate test1`
7. Observe that X is not deleted even after ~30 minutes, and `deletionTimestamp` is not set. 

#### Anything else we need to know?:

Please let me know how I can go about debugging this or any additional information I could provide?

#### Environment:
- Kubernetes version (use `kubectl version`):
on GKE:
```
Client Version: version.Info{Major:"1", Minor:"20", GitVersion:"v1.20.2", GitCommit:"faecb196815e248d3ecfb03c680a4507229c2a56", GitTreeState:"clean", BuildDate:"2021-01-13T13:28:09Z", GoVersion:"go1.15.5", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"20+", GitVersion:"v1.20.6-gke.1000", GitCommit:"3ae0998c5052f420a17cb96bacf860ec5d6822a3", GitTreeState:"clean", BuildDate:"2021-04-29T09:17:16Z", GoVersion:"go1.15.10b5", Compiler:"gc", Platform:"linux/amd64"}
```
on Kind:
```
Client Version: version.Info{Major:"1", Minor:"20", GitVersion:"v1.20.2", GitCommit:"faecb196815e248d3ecfb03c680a4507229c2a56", GitTreeState:"clean", BuildDate:"2021-01-13T13:28:09Z", GoVersion:"go1.15.5", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"21", GitVersion:"v1.21.1", GitCommit:"5e58841cce77d4bc13713ad2b91fa0d961e69192", GitTreeState:"clean", BuildDate:"2021-05-18T01:10:20Z", GoVersion:"go1.16.4", Compiler:"gc", Platform:"linux/amd64"}
```

- Cloud provider or hardware configuration: GKE (1.20.6-gke.1000), Kind
- OS (e.g: `cat /etc/os-release`):
- Kernel (e.g. `uname -a`): `Linux irbe-XPS-13-9310 5.8.0-53-generic #60-Ubuntu SMP Thu May 6 07:46:32 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux`
- Install tools: kubectl, helm
- Network plugin and version (if this is a network-related bug):
- Others:

/cc @munnerz 


---
**@irbekrm** commented on 2021-06-06T18:56:00Z

/sig api-machinery

---
**@fedebongio** commented on 2021-06-08T20:22:31Z

/assign @caesarxuchao 
/triage accepted


---
**@caesarxuchao** commented on 2021-06-09T06:02:29Z

The apiversion is used in gc [here](https://github.com/kubernetes/kubernetes/blob/d849d9d057369121fc43aa3359059471e1ca9d1c/pkg/controller/garbagecollector/operations.go#L64).

Since v1apha1 did not exist anymore, that should trigger this error [message](https://github.com/kubernetes/kubernetes/blob/d849d9d057369121fc43aa3359059471e1ca9d1c/pkg/controller/garbagecollector/garbagecollector.go#L348). If you ran the apiserver with `-v=5`, I would expect this error message in the controller manager log. If that's the case, then it explained why X was not deleted.

But you said that even if you manually fixed the ownerReference before deleting Y, X still wouldn't get gc'ed. I don't know why that's the case. Did you wait for some time between fixing the ownerRef and deleting Y? Did X always not get gc'ed or was the behavior flaky?

cc @liggitt who might know similar issues.

---
**@irbekrm** commented on 2021-06-09T15:37:32Z

Hi @caesarxuchao ,

Thank you for the reply.

I tried to increase the log level as you suggested. From the errors I saw, it appears that somehow the garbage collector has the wrong API version for the _owned_ resource. I've copied the steps from the issue description with where the errors appear:

Steps followed (here `CertificateRequest` X is the owned resource and `Certificate` Y is the owner resource):
1. Deploy cert-manager version `v0.16` where the storage version for all CRDs is `v1alpha2`,
2. Create a `Certificate` (Y) Custom Resource using the `v1alpha2` API. A CertificateRequest X will be created for Y with Y set as X's owner reference.
3. Upgrade to a newer version of cert-manager where the only storage version is `v1` (`v1alpha2` is still being served, so is `v1beta1`)
4. Upgrade stored versions of Custom Resources and `status.storedVersions` of CRDs as described in Kubernetes docs. Also manually edit `metadata.ownerReferences[x].apiVersion for X. Wait for about ~10 minutes
5. Upgrade to a version of cert-manager where `v1` is the only served version
6. Observe some errors in controller manager's logs:
```
I0609 12:36:10.029400       1 reflector.go:255] Listing and watching *v1.PartialObjectMetadata from k8s.io/client-go/metadata/metadatainformer/informer.go:90
E0609 12:36:10.037833       1 reflector.go:138] k8s.io/client-go/metadata/metadatainformer/informer.go:90: Failed to watch *v1.PartialObjectMetadata: failed to list *v1.PartialObjectMetadata: the server could not find the requested resource
```
7. Delete Y `kubectl delete certificate test2`
8. Observe an error in controller manager logs:
```
I0609 15:15:40.213696       1 leaderelection.go:273] successfully renewed lease kube-system/kube-controller-manager
I0609 15:15:40.849078       1 garbagecollector.go:471] "Processing object" object="default/test2-tx5zn" objectUID=e9bebf97-0852-4f93-970f-ba35b88bff98 kind="CertificateRequest" virtual=false
I0609 15:15:40.860584       1 garbagecollector.go:348] error syncing item &garbagecollector.node{identity:garbagecollector.objectReference{OwnerReference:v1.OwnerReference{APIVersion:"cert-manager.io/v1beta1", Kind:"CertificateRequest", Name:"test2-tx5zn", UID:"e9bebf97-0852-4f93-970f-ba35b88bff98", Controller:(*bool)(nil), BlockOwnerDeletion:(*bool)(nil)}, Namespace:"default"}, dependentsLock:sync.RWMutex{w:sync.Mutex{state:0, sema:0x0}, writerSem:0x0, readerSem:0x0, readerCount:1, readerWait:0}, dependents:map[*garbagecollector.node]struct {}{}, deletingDependents:false, deletingDependentsLock:sync.RWMutex{w:sync.Mutex{state:0, sema:0x0}, writerSem:0x0, readerSem:0x0, readerCount:0, readerWait:0}, beingDeleted:false, beingDeletedLock:sync.RWMutex{w:sync.Mutex{state:0, sema:0x0}, writerSem:0x0, readerSem:0x0, readerCount:0, readerWait:0}, virtual:false, virtualLock:sync.RWMutex{w:sync.Mutex{state:0, sema:0x0}, writerSem:0x0, readerSem:0x0, readerCount:0, readerWait:0}, owners:[]v1.OwnerReference{v1.OwnerReference{APIVersion:"cert-manager.io/v1", Kind:"Certificate", Name:"test2", UID:"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086", Controller:(*bool)(0xc002e08f50), BlockOwnerDeletion:(*bool)(0xc002e08f51)}}}: unable to get REST mapping for cert-manager.io/v1beta1/CertificateRequest.
I0609 15:15:42.220403       1 graph_builder.go:632] GraphBuilder process object: v1/ConfigMap, namespace kube-system, name cert-manager-cainjector-leader-election, uid 074426be-cef1-40e3-ad04-5fc09b9d092c, event type update, virtual=false
```
At this point the `v1beta1`, `v1alpha2` APIs are no longer served. In step 4 I had ran `kubectl get certificaterequest test2-tx5zn -oyaml | kubectl apply -f -` to enforce update of the stored version in etcd and checked that the `kubectl.kubernetes.io/last-applied-configuration` annotation now shows the `v1` API version. I assumed that since I can still view and retrieve the `CertificateRequest` after the alpha and beta APIs are no longer served the stored version got updated correctly? I also tried deleting the `kube-controller-manager-kind-control-plane` pod (on `kind`) in case the old version was somehow cashed by the garbage controller- but still saw the same errors.

This is the owned `CertificateRequest` at a point where the owning `Certificate` has been deleted and the garbage collector has thrown the above error.
```
piVersion: cert-manager.io/v1
kind: CertificateRequest
metadata:
  annotations:
    cert-manager.io/certificate-name: test2
    cert-manager.io/certificate-revision: "1"
    cert-manager.io/private-key-secret-name: test2-8kxb6
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"cert-manager.io/v1","kind":"CertificateRequest","metadata":{"annotations":{"cert-manager.io/certificate-name":"test2","cert-manager.io/certificate-revision":"1","cert-manager.io/private-key-secret-name":"test2-8kxb6"},"creationTimestamp":"2021-06-09T14:48:56Z","generateName":"test2-","generation":1,"managedFields":[{"apiVersion":"cert-manager.io/v1alpha2","fieldsType":"FieldsV1","fieldsV1":{"f:metadata":{"f:annotations":{".":{},"f:cert-manager.io/certificate-name":{},"f:cert-manager.io/certificate-revision":{},"f:cert-manager.io/private-key-secret-name":{},"f:kubectl.kubernetes.io/last-applied-configuration":{}},"f:generateName":{},"f:ownerReferences":{".":{},"k:{\"uid\":\"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086\"}":{".":{},"f:apiVersion":{},"f:blockOwnerDeletion":{},"f:controller":{},"f:kind":{},"f:name":{},"f:uid":{}}}},"f:spec":{".":{},"f:csr":{},"f:issuerRef":{".":{},"f:group":{},"f:kind":{},"f:name":{}}},"f:status":{".":{},"f:ca":{},"f:certificate":{},"f:conditions":{}}},"manager":"controller","operation":"Update","time":"2021-06-09T14:48:58Z"}],"name":"test2-tx5zn","namespace":"default","ownerReferences":[{"apiVersion":"cert-manager.io/v1","blockOwnerDeletion":true,"controller":true,"kind":"Certificate","name":"test2","uid":"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086"}],"resourceVersion":"971","uid":"e9bebf97-0852-4f93-970f-ba35b88bff98"},"spec":{"issuerRef":{"group":"cert-manager.io","kind":"Issuer","name":"selfsigned-issuer-legacy"},"request":"<redacted>"},"status":{"ca":<redacted>,"certificate":"<redacted>","message":"Certificate fetched from issuer successfully","reason":"Issued","status":"True","type":"Ready"}]}}
  creationTimestamp: "2021-06-09T14:48:56Z"
  generateName: test2-
  generation: 1
  managedFields:
  - apiVersion: cert-manager.io/v1alpha2
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          .: {}
          f:cert-manager.io/certificate-name: {}
          f:cert-manager.io/certificate-revision: {}
          f:cert-manager.io/private-key-secret-name: {}
        f:generateName: {}
        f:ownerReferences:
          .: {}
          k:{"uid":"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086"}:
            .: {}
            f:blockOwnerDeletion: {}
            f:controller: {}
            f:kind: {}
            f:name: {}
            f:uid: {}
      f:spec:
        .: {}
        f:csr: {}
        f:issuerRef:
          .: {}
          f:group: {}
          f:kind: {}
          f:name: {}
      f:status:
        .: {}
        f:ca: {}
        f:certificate: {}
        f:conditions: {}
    manager: controller
    operation: Update
    time: "2021-06-09T14:48:58Z"
  - apiVersion: cert-manager.io/v1
    fieldsType: FieldsV1
    fieldsV1:
      f:metadata:
        f:annotations:
          f:kubectl.kubernetes.io/last-applied-configuration: {}
        f:ownerReferences:
          k:{"uid":"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086"}:
            f:apiVersion: {}
    manager: kubectl-client-side-apply
    operation: Update
    time: "2021-06-09T14:54:09Z"
  name: test2-tx5zn
  namespace: default
  ownerReferences:
  - apiVersion: cert-manager.io/v1
    blockOwnerDeletion: true
    controller: true
    kind: Certificate
    name: test2
    uid: 7c5bbe6e-a9b3-490d-af2f-8e719ba5b086
  resourceVersion: "1862"
  uid: e9bebf97-0852-4f93-970f-ba35b88bff98
spec:
  issuerRef:
    group: cert-manager.io
    kind: Issuer
    name: selfsigned-issuer-legacy
  request: <redacted>
status:
  ca: <redacted>
  certificate: <redacted>
  conditions:
  - lastTransitionTime: "2021-06-09T14:48:56Z"
    message: Certificate fetched from issuer successfully
    reason: Issued
    status: "True"
    type: Ready
```

Would you have any suggestion how to go further about debugging this?
(This is on `kind`, k8s `v1.21`)

---
**@caesarxuchao** commented on 2021-06-10T22:32:12Z

@irbekrm thanks for the detailed logs.

I skimmed through [graph_builder.go](https://github.com/kubernetes/kubernetes/blob/53873fbf23aa357aeae6e1b6f8cd8459fd459407/pkg/controller/garbagecollector/graph_builder.go) and it looks like that the gc controller never updates [node.APIVersion](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/garbagecollector/graph.go#L42-L43).

I reformatted the node in the error message in your previous comment so it's easier to read:

```
{
    identity:garbagecollector.objectReference{
        OwnerReference:v1.OwnerReference{APIVersion:"cert-manager.io/v1beta1", Kind:"CertificateRequest", Name:"test2-tx5zn", UID:"e9bebf97-0852-4f93-970f-ba35b88bff98", Controller:(*bool)(nil), BlockOwnerDeletion:(*bool)(nil)},
        Namespace:"default"}, 
    dependents:map[*garbagecollector.node]struct {}{}, 
    deletingDependents:false, 
    beingDeleted:false, 
    virtual:false,
    owners:[]v1.OwnerReference{
        v1.OwnerReference{APIVersion:"cert-manager.io/v1", Kind:"Certificate", Name:"test2", UID:"7c5bbe6e-a9b3-490d-af2f-8e719ba5b086", Controller:(*bool)(0xc002e08f50), BlockOwnerDeletion:(*bool)(0xc002e08f51)}
        }
}
```

As you mentioned, the dependent's APIVersion is not updated (`APIVersion:"cert-manager.io/v1beta1", Kind:"CertificateRequest"`). Somehow the Owner's APIVersion is updated (`APIVersion:"cert-manager.io/v1", Kind:"Certificate"`). I actually don't know why the APIVersion of the owner is up-to-date.

Also I wonder why we haven't seen similar GC issues when Kubernetes stopped serving apps/v1beta1 and apiextensions/v1beta1 in the past releases. @liggitt do you know?

Perhaps we can fix the issue [here](https://github.com/kubernetes/kubernetes/blob/53873fbf23aa357aeae6e1b6f8cd8459fd459407/pkg/controller/garbagecollector/graph_builder.go#L677), here GC observes an object is updated, we can let GC checks if the APIVersion in the update event is the same as the APIVersion recorded in the in-memory node, if not, updates the in-memory APIVersion. @irbekrm do you have time to write&test a patch? 




---
**@irbekrm** commented on 2021-06-11T12:32:19Z

@caesarxuchao thank you for looking at this!

> Perhaps we can fix the issue here, here GC observes an object is updated, we can let GC checks if the APIVersion in the update event is the same as the APIVersion recorded in the in-memory node, if not, updates the in-memory APIVersion. @irbekrm do you have time to write&test a patch?

I should have time to for this in the next couple of days- thanks for pointing me in the right direction!

---
**@liggitt** commented on 2021-06-14T15:49:30Z

> I wonder why we haven't seen similar GC issues when Kubernetes stopped serving apps/v1beta1 and apiextensions/v1beta1 in the past releases. @liggitt do you know?

likely because that was paired with a Kubernetes upgrade which eventually restarted the kube-controller-manager, at which point it picked up the apps/v1 versions of those resources



---
**@irbekrm** commented on 2021-06-21T07:21:55Z

@caesarxuchao sorry for the delay!

> Perhaps we can fix the issue here, here GC observes an object is updated, we can let GC checks if the APIVersion in the update event is the same as the APIVersion recorded in the in-memory node, if not, updates the in-memory APIVersion. @irbekrm do you have time to write&test a patch?

[Updating the API version when the object is updated](https://github.com/kubernetes/kubernetes/pull/103033/commits/1ada461ee968a8f07512cd45be9cd462b66a3806) seems to fix it. I built this version a couple of times with the scenario described in https://github.com/kubernetes/kubernetes/issues/102641#issuecomment-857809490 and saw the owned resource being correctly garbage collected each time.

> Somehow the Owner's APIVersion is updated (APIVersion:"cert-manager.io/v1", Kind:"Certificate"). I actually don't know why the APIVersion of the owner is up-to-date.

It seemed to get updated [here](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/garbagecollector/graph_builder.go#L685) at least in the scenarios I tested.

I submitted a tentative PR with a one-line fix for this, but have not yet looked at updating the tests to test this change.





