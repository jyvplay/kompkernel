### Dafny version

4.11.0

### Code to produce this issue

```dafny
datatype list<T> = Nil | Cons(hd:T, tl:list<T>)
datatype option<T> = None | Some(T)

function append<T>(l1 : list<T>, l2:list<T>) : list<T>
{
    match l1 case Nil => l2
    case Cons(x,xs) => Cons(x,append(xs,l2))
}

function member(i : int, l : list<int>):bool
{
    match l case Nil => false
    case Cons(j,js) => i == j || member(i,js)
}

lemma member_append(i : int, l1 : list<int>, l2 : list<int>)
  ensures member(i, append(l1,l2)) <==> member(i,l1) || member(i,l2)
{}

datatype btree<V> = Lf | Node(k : int, value:V, left:btree, right:btree)

function lookup<V>(t : btree<V>, k:int) : option<V>
{
    match t
    case Lf => None
    case Node(j,v,left,right) =>
      if k == j then Some(v)
      else if k < j then lookup(left,k)
      else lookup(right, k)
}

function keys<V>(t : btree<V>) : list<int>
{
    match t
    case Lf => Nil
    case Node(k, _, l, r) => append(keys(l), Cons(k, keys(r)))
}

function wftree<V>( t : btree<V> ) : bool
{
  match t case Lf => true
  case Node(k,_, left, right) =>
    wftree(left) && wftree(right) &&
    below_allT(k,right) && above_allT(left, k)
}

predicate below_allT<V>(k:int, t:btree<V>)
{
    match t case Lf => true
    case Node (j, _, left, right) => k < j && below_allT(k,left) && below_allT(k,right)
}

predicate above_allT<V>(t:btree<V>, k:int)
{
    match t case Lf => true
    case Node(j, _, left, right) => j < k && above_allT(left, k) && above_allT(right, k)
}

lemma keys_have_values<V>(t : btree<V>, k:int)
  requires wftree(t)
  requires member(k,keys(t))
  ensures exists v :: lookup(t, k) == Some(v)
{
  match t case Lf => {}
  case Node(j,v,left, right) =>
  {
    if k == j { assert lookup(t,k) == Some(v);}
    else {
      assert member(k, append(keys(left), Cons(j, keys(right))));
      member_append(k, keys(left), Cons(j, keys(right)));
      assert member(k, keys(left)) || member(k, keys(right));
      if member(k, keys(left)) {
        assert member(k, keys(left));
        assert wftree(left);
        keys_have_values(left, k);
        var u :| lookup(left, k) == Some(val);
      } else{
        assert member(k, keys(right));
      }
    }
  }
}
```

### Command to run and resulting output

```code
Run 
> dafny verify file.dfy

get 


Encountered internal compilation exception: Object reference not set to an instance of an object.
Unhandled exception: System.NullReferenceException: Object reference not set to an instance of an object.
   at Microsoft.Dafny.AssignSuchThatStmt.<>c__DisplayClass11_0.<.ctor>b__0(BoundedPool bp) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/Assignment/AssignSuchThatStmt.cs:line 45
   at System.Linq.Enumerable.SelectListIterator`2.Fill(ReadOnlySpan`1 source, Span`1 destination, Func`2 func)
   at System.Linq.Enumerable.SelectListIterator`2.ToList()
   at Microsoft.Dafny.AssignSuchThatStmt..ctor(Cloner cloner, AssignSuchThatStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/Assignment/AssignSuchThatStmt.cs:line 45
   at Microsoft.Dafny.AssignSuchThatStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/Assignment/AssignSuchThatStmt.cs:line 37
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.VarDeclStmt..ctor(Cloner cloner, VarDeclStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/Assignment/VarDeclStmt.cs:line 23
   at Microsoft.Dafny.VarDeclStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/Assignment/VarDeclStmt.cs:line 18
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.BlockStmt.<>c__DisplayClass3_0.<.ctor>b__0(Statement stmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at System.Linq.Enumerable.SelectListIterator`2.Fill(ReadOnlySpan`1 source, Span`1 destination, Func`2 func)
   at System.Linq.Enumerable.SelectListIterator`2.ToList()
   at Microsoft.Dafny.BlockStmt..ctor(Cloner cloner, BlockLikeStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at Microsoft.Dafny.Cloner.CloneBlockStmt(BlockStmt stmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 401
   at Microsoft.Dafny.IfStmt..ctor(Cloner cloner, IfStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/ControlFlow/IfStmt.cs:line 26
   at Microsoft.Dafny.IfStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/ControlFlow/IfStmt.cs:line 20
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.BlockStmt.<>c__DisplayClass3_0.<.ctor>b__0(Statement stmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at System.Linq.Enumerable.SelectListIterator`2.Fill(ReadOnlySpan`1 source, Span`1 destination, Func`2 func)
   at System.Linq.Enumerable.SelectListIterator`2.ToList()
   at Microsoft.Dafny.BlockStmt..ctor(Cloner cloner, BlockLikeStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at Microsoft.Dafny.BlockStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 34
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.IfStmt..ctor(Cloner cloner, IfStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/ControlFlow/IfStmt.cs:line 27
   at Microsoft.Dafny.IfStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/ControlFlow/IfStmt.cs:line 20
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.BlockStmt.<>c__DisplayClass3_0.<.ctor>b__0(Statement stmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at System.Linq.Enumerable.SelectListIterator`2.Fill(ReadOnlySpan`1 source, Span`1 destination, Func`2 func)
   at System.Linq.Enumerable.SelectListIterator`2.ToList()
   at Microsoft.Dafny.BlockStmt..ctor(Cloner cloner, BlockLikeStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 12
   at Microsoft.Dafny.BlockStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Statements/BlockStmt.cs:line 34
   at Microsoft.Dafny.Cloner.CloneStmt(Statement stmt, Boolean isReference) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Cloner.cs:line 428
   at Microsoft.Dafny.NestedMatchCaseStmt.<>c__DisplayClass8_0.<.ctor>b__0(Statement stmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Expressions/Conditional/NestedMatchCaseStmt.cs:line 21
   at System.Linq.Enumerable.SelectListIterator`2.Fill(ReadOnlySpan`1 source, Span`1 destination, Func`2 func)
   at System.Linq.Enumerable.SelectListIterator`2.ToList()
   at Microsoft.Dafny.NestedMatchCaseStmt..ctor(Cloner cloner, NestedMatchCaseStmt original) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Expressions/Conditional/NestedMatchCaseStmt.cs:line 21
   at Microsoft.Dafny.NestedMatchCaseStmt.Clone(Cloner cloner) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Expressions/Conditional/NestedMatchCaseStmt.cs:line 26
   at Microsoft.Dafny.MatchFlattener.<>c.<CompileNestedMatchStmt>b__6_0(NestedMatchCaseStmt nms) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/CompileNestedMatch/MatchFlattener.cs:line 116
   at System.Linq.Enumerable.SelectEnumerableIterator`2.ToList()
   at Microsoft.Dafny.MatchFlattener.CompileNestedMatchStmt(NestedMatchStmt nestedMatchStmt) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/CompileNestedMatch/MatchFlattener.cs:line 115
   at Microsoft.Dafny.MatchFlattener.<>c__DisplayClass4_0.<FlattenNode>b__0(INode node) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/CompileNestedMatch/MatchFlattener.cs:line 66
   at Microsoft.Dafny.Node.Visit(Func`2 beforeChildren, Action`1 afterChildren, Action`1 reportError) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Generic/Node.cs:line 174
   at Microsoft.Dafny.MatchFlattener.FlattenNode(Node root) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/CompileNestedMatch/MatchFlattener.cs:line 55
   at Microsoft.Dafny.MatchFlattener.PostResolve(ModuleDefinition module) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/CompileNestedMatch/MatchFlattener.cs:line 51
   at Microsoft.Dafny.LiteralModuleDecl.Resolve(ModuleResolver resolver, CompilationData compilation) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/AST/Modules/LiteralModuleDecl.cs:line 183
   at Microsoft.Dafny.ModuleResolver.ResolveModuleDeclaration(CompilationData compilation, ModuleDecl decl) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Resolver/ModuleResolver.cs:line 185
   at Microsoft.Dafny.ProgramResolver.ResolveModuleDeclaration(CompilationData compilation, ModuleDecl decl) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Resolver/ProgramResolver.cs:line 173
   at Microsoft.Dafny.ProgramResolver.Resolve(CancellationToken cancellationToken) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Resolver/ProgramResolver.cs:line 67
   at Microsoft.Dafny.LanguageServer.Language.Symbols.DafnyLangSymbolResolver.RunDafnyResolver(Compilation compilation, Program program, CancellationToken cancellationToken) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyLanguageServer/Language/Symbols/DafnyLangSymbolResolver.cs:line 54
   at Microsoft.Dafny.LanguageServer.Language.Symbols.DafnyLangSymbolResolver.ResolveSymbols(Compilation compilation, Program program, CancellationToken cancellationToken) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyLanguageServer/Language/Symbols/DafnyLangSymbolResolver.cs:line 41
   at Microsoft.Dafny.TextDocumentLoader.ResolveInternal(Compilation compilation, Program program, CancellationToken cancellationToken) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Pipeline/TextDocumentLoader.cs:line 56
   at Microsoft.Dafny.TextDocumentLoader.ResolveAsync(Compilation compilation, Program program, CancellationToken cancellationToken) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Pipeline/TextDocumentLoader.cs:line 46
   at Microsoft.Dafny.Compilation.ResolveAsync() in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Pipeline/Compilation.cs:line 276
   at Microsoft.Dafny.Compilation.LogExceptions() in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyCore/Pipeline/Compilation.cs:line 120
   at Microsoft.Dafny.VerifyCommand.HandleVerification(DafnyOptions options) in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyDriver/Commands/VerifyCommand.cs:line 66
   at Microsoft.Dafny.DafnyNewCli.<>c__DisplayClass5_0.<<SetHandlerUsingDafnyOptionsContinuation>g__Handle|0>d.MoveNext() in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyDriver/DafnyNewCli.cs:line 146
--- End of stack trace from previous location ---
   at System.CommandLine.Invocation.AnonymousCommandHandler.InvokeAsync(InvocationContext context)
   at System.CommandLine.Invocation.InvocationPipeline.<>c__DisplayClass4_0.<<BuildInvocationChain>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass17_0.<<UseParseErrorReporting>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at System.CommandLine.Builder.CommandLineBuilderExtensions.<>c__DisplayClass12_0.<<UseHelp>b__0>d.MoveNext()
--- End of stack trace from previous location ---
   at Microsoft.Dafny.DafnyNewCli.<>c__DisplayClass17_0.<<AddDeveloperHelp>b__1>d.MoveNext() in /private/tmp/dafny-20250827-10241-gekk39/dafny-4.11.0/Source/DafnyDriver/DafnyNewCli.cs:line 277
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
```

### What happened?

File is fine until introduction of `var u :| ... ; ` line.  Would prefer not to see a runtime exception!

### What type of operating system are you experiencing the problem on?

Mac
