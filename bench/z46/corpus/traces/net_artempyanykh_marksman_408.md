I've been running into an issue with Marksman crashing in Neovim. It has happened multiple times while editing Markdown files. It seems to happen most when editing headings, but I can't say for sure. I do not have concrete steps to reproduce.

Marksman version: 2024-12-18
Neovim version:
```
NVIM v0.11.1
Build type: Release
LuaJIT 2.1.1744318430
Run "nvim -V1 -v" for more info
```

Error log:

```
[ERROR][2025-05-22 16:56:19] ...p/_transport.lua:36	"rpc"	"marksman"	"stderr"	"Unhandled exception: "
[ERROR][2025-05-22 16:56:19] ...p/_transport.lua:36	"rpc"	"marksman"	"stderr"	"System.AggregateException: One or more errors occurred. (MailboxProcessor.PostAndAsyncReply timed out.)
 ---> System.TimeoutException: MailboxProcessor.PostAndAsyncReply timed out.
   at <StartupCode$FSharp-Core>.$Mailbox.PostAndAsyncReply@497-1.Invoke(FSharpOption`1 res) in D:\\a\\_work\\1\\s\\src\\FSharp.Core\\mailbox.fs:line 498
   at Microsoft.FSharp.Control.AsyncPrimitives.CallThenInvokeNoHijackCheck[a,b](AsyncActivation`1 ctxt, b result1, FSharpFunc`2 userCode) in D:\\a\\_work\\1\\s\\src\\FSharp.Core\\async.fs:line 528
   at Microsoft.FSharp.Control.Trampoline.Execute(FSharpFunc`2 firstAction) in D:\\a\\_work\\1\\s\\src\\FSharp.Core\\async.fs:line 112
   --- End of inner exception stack trace ---
   at Ionide.LanguageServerProtocol.Server.startWithSetup[client](FSharpFunc`2 setupRequestHandlings, Stream input, Stream output, FSharpFunc`2 clientCreator, FSharpFunc`2 customizeRpc) in /Users/runner/work/marksman/marksman/LanguageServerProtocol/LanguageServerProtocol.fs:line 205
   at Ionide.LanguageServerProtocol.Server.start@309-2.Invoke(FSharpFunc`2 customizeRpc)
   at Marksman.Program.startLSP(Int32 verbosity, Boolean waitForDebugger) in /Users/runner/work/marksman/marksman/Marksman/Program.fs:line 57
   at Marksman.Program.lspCommand@86.Invoke(Tuple`2 tupledArg)
   at FSharp.SystemCommandLine.CommandBuilders.SetHandlerInt@207-2.Invoke(InvocationContext ctx)
   at System.CommandLine.Invocation.AnonymousCommandHandler.Invoke(InvocationContext)
   at System.CommandLine.Invocation.InvocationPipeline.<>c__DisplayClass4_0.<<BuildInvocationChain>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass17_0.<<UseParseErrorReporting>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass12_0.<<UseHelp>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass22_0.<<UseVersionOption>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass19_0.<<UseTypoCorrections>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c.<<UseSuggestDirective>b__18_0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass16_0.<<UseParseDirective>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c.<<RegisterWithDotnetSuggest>b__5_0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass8_0.<<UseExceptionHandler>b__0>d.MoveNext()
"
```

