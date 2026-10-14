Sentry Issue: [UNITY-EXPLORER-QS4](https://decentraland.sentry.io/issues/7784875843/)

```
System.Exception: UnexpectedException: Unhandled exception on Teleporting to Parcel attempt 1/1: System.Exception: Exception occured on loading DCL.Ipfs.SceneDefinitions from ECS.SceneLifeCycle.SceneDefinition.GetSceneDefinitionList with url https://gateway.decentraland.org/asset-bundle-registry-abgen/entities/active.
No more sources left. ---> Cysharp.Threading.Tasks.UnityWebRequestException: Request timeout
  at Cysharp.Threading.Tasks.UniTaskCompletionSourceCore`1[TResult].GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UniTaskCompletionSource.cs:244 
  at Cysharp.Threading.Tasks.UnityAsyncExtensions+UnityWebRequestAsyncOperationConfiguredSource.GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UnityAsyncExtensions.cs:1106 
  at Cysharp.Threading.Tasks.UniTask`1+Awaiter[T].GetResult () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UniTask.cs:657 
  at DCL.WebRequests.TypedWebRequestExtensions.SendRequestAsync[T] (T typedWebRequest, System.Threading.CancellationToken token, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/ITypedWebRequest.cs:29 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`1[TStateMachine].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:189 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
--- End of stack trace from previous location where exception was thrown ---

  at Cysharp.Threading.Tasks.UniTaskCompletionSourceCore`1[TResult].GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UniTaskCompletionSource.cs:244 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`1[TStateMachine].GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:218 
  at DCL.WebRequests.WebRequestController.SendAsync[TWebRequest,TWebRequestArgs,TWebRequestOp,TResult] (DCL.WebRequests.RequestEnvelope`2[TWebRequest,TWebRequestArgs] envelope, TWebRequestOp op, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/WebRequestController.cs:88 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`2[TStateMachine,T].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:313 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at DCL.WebRequests.TypedWebRequestExtensions.SendRequestAsync[T] (T typedWebRequest, System.Threading.CancellationToken token, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/ITypedWebRequest.cs:53 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`1[TStateMachine].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:189 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
--- End of stack trace from previous location where exception was thrown ---

  at DCL.WebRequests.WebRequestController.SendAsync[TWebRequest,TWebRequestArgs,TWebRequestOp,TResult] (DCL.WebRequests.RequestEnvelope`2[TWebRequest,TWebRequestArgs] envelope, TWebRequestOp op, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/WebRequestController.cs:129 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`2[TStateMachine,T].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:313 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at DCL.WebRequests.TypedWebRequestExtensions.SendRequestAsync[T] (T typedWebRequest, System.Threading.CancellationToken token, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/ITypedWebRequest.cs:53 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`1[TStateMachine].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:189 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
--- End of stack trace from previous location where exception was thrown ---

  at DCL.WebRequests.WebRequestController.SendAsync[TWebRequest,TWebRequestArgs,TWebRequestOp,TResult] (DCL.WebRequests.RequestEnvelope`2[TWebRequest,TWebRequestArgs] envelope, TWebRequestOp op, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/WebRequestController.cs:63 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`2[TStateMachine,T].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:313 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at DCL.WebRequests.TypedWebRequestExtensions.SendRequestAsync[T] (T typedWebRequest, System.Threading.CancellationToken token, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/ITypedWebRequest.cs:53 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`1[TStateMachine].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:189 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
--- End of stack trace from previous location where exception was thrown ---

  at Cysharp.Threading.Tasks.UniTaskCompletionSourceCore`1[TResult].GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UniTaskCompletionSource.cs:244 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`2[TStateMachine,T].GetResult (System.Int16 token) [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:342 
  at Cysharp.Threading.Tasks.UniTask`1+Awaiter[T].GetResult () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/UniTask.cs:657 
  at DCL.WebRequests.DebugMetricsWebRequestController.SendAsync[TWebRequest,TWebRequestArgs,TWebRequestOp,TResult] (DCL.WebRequests.RequestEnvelope`2[TWebRequest,TWebRequestArgs] envelope, TWebRequestOp op, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/DebugMetricsWebRequestController.cs:28 
  at Cysharp.Threading.Tasks.CompilerServices.AsyncUniTask`2[TStateMachine,T].Run () [0x00000] in ./Library/PackageCache/com.cysharp.unitask@d648f5692cf2/Runtime/CompilerServices/StateMachineRunner.cs:313 
  at System.Action`1[T].Invoke (T obj) [0x00000] in <00000000000000000000000000000000>:1 
  at DCL.WebRequests.WebRequestController.SendAsync[TWebRequest,TWebRequestArgs,TWebRequestOp,TResult] (DCL.WebRequests.RequestEnvelope`2[TWebRequest,TWebRequestArgs] envelope, TWebRequestOp op, System.Int64 expectedContentLength, System.IProgress`1[T] progressReporter) [0x00000] in C:/workspace/workspace/p/Explorer/Assets/DCL/WebRequests/WebRequestController.cs:63 
  at Cysharp.Threading...
  File "Utility__2.cpp", line 33948, in WaitUntilFinishedAsync
  File "Utility__2.cpp", line 33654, in SetException
  File "il2cpp-codegen.h", line 792, in MoveNext
  File "DCL.RealmNavigation.cpp", line 17922, in MoveNext
  File "DCL.RealmNavigation.cpp", line 29791, in MoveNext
...
(69 additional frame(s) were not displayed)
```
This issue was automatically created by Sentry via [Explorer Alpha Github Issue Creation](https://sentry.io/organizations/decentraland/monitors/alerts/3130340/)
