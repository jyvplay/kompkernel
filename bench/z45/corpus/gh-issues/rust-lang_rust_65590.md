# Rustc panicked while running rls

**@Leo1003** opened on 2019-10-19T06:48:36Z

When using rls with both beta and nightly toolchain, it keeps complaining that `could not compile hyper`. However, it could build in both debug and release mode without any error! 

So I tried to run with `RUST_BACKTRACE=1 rls --cli`.
Then the compiler panicked: 
```
{"message":"src/librustc/ty/context.rs:211: node type <W>::Future (hir_id=HirId { owner: DefIndex(4347), local_id: 28 }) with HirId::owner DefId(0:4347 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0]::__State[0]) cannot be placed in TypeckTables with local_id_root DefId(0:4346 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0])","code":null,"level":"error: internal compiler error","spans":[],"children":[],"rendered":"error: internal compiler error: src/librustc/ty/context.rs:211: node type <W>::Future (hir_id=HirId { owner: DefIndex(4347), local_id: 28 }) with HirId::owner DefId(0:4347 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0]::__State[0]) cannot be placed in TypeckTables with local_id_root DefId(0:4346 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0])\n\n"}
```
The Rendered Message: 
```
error: internal compiler error: src/librustc/ty/context.rs:211: node type <W>::Future (hir_id=HirId { owner: DefIndex(4347), local_id: 28 }) with HirId::owner DefId(0:4347 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0]::__State[0]) cannot be placed in TypeckTables with local_id_root DefId(0:4346 ~ hyper[32ed]::server[0]::conn[0]::spawn_all[0]::__unpin_scope_State[0])
```

Currently, I don't know which codes in the hyper crate cause this error...

## Meta
### Beta: 
```
rustc 1.39.0-beta.6 (224f0bc90 2019-10-15)
binary: rustc
commit-hash: 224f0bc90c010b88ca6ec600c9b02f6e3638d78e
commit-date: 2019-10-15
host: x86_64-unknown-linux-gnu
release: 1.39.0-beta.6
LLVM version: 9.0
```
### Nightly:
```
rustc 1.40.0-nightly (e413dc36a 2019-10-14)
binary: rustc
commit-hash: e413dc36a83a5aad3ab6270373000693a917e92b
commit-date: 2019-10-14
host: x86_64-unknown-linux-gnu
release: 1.40.0-nightly
LLVM version: 9.0
``` 
### Related Crates
- `reqwest v0.10.0-alpha.1`
- `hyper-tls v0.4.0-alpha.4`
- `hyper v0.13.0-alpha.4`

## Backtrace:
```
thread 'rustc' panicked at 'Box<Any>', src/librustc_errors/lib.rs:812:9
stack backtrace:
   0: backtrace::backtrace::libunwind::trace
             at /cargo/registry/src/github.com-1ecc6299db9ec823/backtrace-0.3.37/src/backtrace/libunwind.rs:88
   1: backtrace::backtrace::trace_unsynchronized
             at /cargo/registry/src/github.com-1ecc6299db9ec823/backtrace-0.3.37/src/backtrace/mod.rs:66
   2: std::sys_common::backtrace::_print_fmt
             at src/libstd/sys_common/backtrace.rs:76
   3: <std::sys_common::backtrace::_print::DisplayBacktrace as core::fmt::Display>::fmt
             at src/libstd/sys_common/backtrace.rs:60
   4: core::fmt::write
             at src/libcore/fmt/mod.rs:1030
   5: std::io::Write::write_fmt
             at src/libstd/io/mod.rs:1412
   6: std::sys_common::backtrace::_print
             at src/libstd/sys_common/backtrace.rs:64
   7: std::sys_common::backtrace::print
             at src/libstd/sys_common/backtrace.rs:49
   8: std::panicking::default_hook::{{closure}}
             at src/libstd/panicking.rs:196
   9: std::panicking::default_hook
             at src/libstd/panicking.rs:210
  10: rustc_driver::report_ice
  11: std::panicking::rust_panic_with_hook
             at src/libstd/panicking.rs:477
  12: std::panicking::begin_panic
  13: rustc_errors::HandlerInner::bug
  14: rustc_errors::Handler::bug
  15: rustc::util::bug::opt_span_bug_fmt::{{closure}}
  16: rustc::ty::context::tls::with_opt::{{closure}}
  17: rustc::ty::context::tls::with_context_opt
  18: rustc::ty::context::tls::with_opt
  19: rustc::util::bug::opt_span_bug_fmt
  20: rustc::util::bug::bug_fmt
  21: rustc::ty::context::validate_hir_id_for_typeck_tables::{{closure}}
  22: rustc::ty::context::tls::with::{{closure}}
  23: rustc::ty::context::tls::with_context::{{closure}}
  24: rustc::ty::context::tls::with_context_opt
  25: rustc::ty::context::tls::with_context
  26: rustc::ty::context::tls::with
  27: rustc::ty::context::TypeckTables::qpath_res
  28: rustc_save_analysis::SaveContext::get_path_res
  29: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_ty
  30: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  31: rustc_save_analysis::dump_visitor::DumpVisitor::process_fn::{{closure}}
  32: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  33: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  34: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  35: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  36: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_mod
  37: rustc::dep_graph::graph::DepGraph::with_ignore
  38: rustc_driver::run_compiler::{{closure}}::{{closure}}::{{closure}}
  39: rustc::util::common::time
  40: rustc_interface::passes::BoxedGlobalCtxt::access::{{closure}}
  41: rustc_interface::passes::create_global_ctxt::{{closure}}
  42: rustc_interface::interface::run_compiler_in_existing_thread_pool
  43: std::thread::local::LocalKey<T>::with
  44: scoped_tls::ScopedKey<T>::set
  45: syntax::with_globals
note: Some details are omitted, run with `RUST_BACKTRACE=full` for a verbose backtrace.

note: the compiler unexpectedly panicked. this is a bug.

note: we would appreciate a bug report: https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md#bug-reports

note: rustc 1.39.0-beta.6 (224f0bc90 2019-10-15) running on x86_64-unknown-linux-gnu

note: compiler flags: -C debuginfo=2 --crate-type lib

note: some of the compiler flags provided by cargo are hidden
```


---
**@mati865** commented on 2019-10-19T08:26:20Z

Possibly fixed by https://github.com/rust-lang/rust/pull/65353 or https://github.com/rust-lang/rust/pull/65511
Can you test again tomorrow with latest nightly?

---
**@Leo1003** commented on 2019-10-19T10:11:35Z

> Possibly fixed by #65353 or #65511
> Can you test again tomorrow with latest nightly?

No problem!

---
**@Leo1003** commented on 2019-10-19T10:24:57Z

Just upgraded to latest nightly and tested. 
I can confirm that it has been fixed in: 
```
rustc 1.40.0-nightly (518deda77 2019-10-18)
binary: rustc
commit-hash: 518deda77feb4957bfd311b6cb50baa7ef9ca6a2
commit-date: 2019-10-18
host: x86_64-unknown-linux-gnu
release: 1.40.0-nightly
LLVM version: 9.0
```

I think this issue can be closed now.

---
**@jonas-schievink** commented on 2019-10-19T11:19:25Z

Closing as fixed. Thanks for reporting and testing!

---
**@Walther** commented on 2019-10-19T17:26:10Z

Ran into this even with the latest nightly, `rayon` being the culprit at my end:

```
[dependencies]
structopt = "0.3.3"
clap = "2.33.0"
serde = "1.0.101"
serde_derive = "1.0.101"
serde_json = "1.0.41"
serde_yaml = "0.8.11"
rayon = "1.2.0"
async-std = "0.99.10"
```

```
{"message":"src/librustc/ty/context.rs:211: node type <B>::Item (hir_id=HirId { owner: DefIndex(246), local_id: 15 }) with HirId::owner DefId(0:246 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0]::{{impl}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:238 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0])","code":null,"level":"error: internal compiler error","spans":[],"children":[],"rendered":"\^[[0m\^[[1m\^[[38;5;9merror: internal compiler error\^[[0m\^[[0m\^[[1m: src/librustc/ty/context.rs:211: node type <B>::Item (hir_id=HirId { owner: DefIndex(246), local_id: 15 }) with HirId::owner DefId(0:246 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0]::{{impl}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:238 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0])\^[[0m\n\n"}
thread 'rustc' panicked at 'Box<Any>', src/librustc_errors/lib.rs:925:9
note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace.

note: the compiler unexpectedly panicked. this is a bug.

note: we would appreciate a bug report: https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md#bug-reports

note: rustc 1.40.0-nightly (518deda77 2019-10-18) running on x86_64-apple-darwin

note: compiler flags: -C debuginfo=2 --crate-type lib

note: some of the compiler flags provided by cargo are hidden
```

Re-run with backtrace:

<details>

```
{"message":"src/librustc/ty/context.rs:211: node type <B>::Item (hir_id=HirId { owner: DefIndex(246), local_id: 15 }) with HirId::owner DefId(0:246 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0]::{{impl}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:238 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0])","code":null,"level":"error: internal compiler error","spans":[],"children":[],"rendered":"\^[[0m\^[[1m\^[[38;5;9merror: internal compiler error\^[[0m\^[[0m\^[[1m: src/librustc/ty/context.rs:211: node type <B>::Item (hir_id=HirId { owner: DefIndex(246), local_id: 15 }) with HirId::owner DefId(0:246 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0]::{{impl}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:238 ~ rayon[6715]::iter[0]::chain[0]::{{impl}}[2]::with_producer[0])\^[[0m\n\n"}
thread 'rustc' panicked at 'Box<Any>', src/librustc_errors/lib.rs:925:9
stack backtrace:
   0: <std::sys_common::backtrace::_print::DisplayBacktrace as core::fmt::Display>::fmt
   1: core::fmt::write
   2: std::io::Write::write_fmt
   3: std::panicking::default_hook::{{closure}}
   4: std::panicking::default_hook
   5: rustc_driver::report_ice
   6: std::panicking::rust_panic_with_hook
   7: std::panicking::begin_panic
   8: rustc_errors::HandlerInner::bug
   9: rustc_errors::Handler::bug
  10: rustc::util::bug::opt_span_bug_fmt::{{closure}}
  11: rustc::ty::context::tls::with_opt::{{closure}}
  12: rustc::ty::context::tls::with_context_opt
  13: rustc::ty::context::tls::with_opt
  14: rustc::util::bug::opt_span_bug_fmt
  15: rustc::util::bug::bug_fmt
  16: rustc::ty::context::validate_hir_id_for_typeck_tables::{{closure}}
  17: rustc::ty::context::tls::with::{{closure}}
  18: rustc::ty::context::tls::with_context::{{closure}}
  19: rustc::ty::context::tls::with_context_opt
  20: rustc::ty::context::tls::with_context
  21: rustc::ty::context::tls::with
  22: rustc::ty::context::TypeckTables::qpath_res
  23: rustc_save_analysis::SaveContext::get_path_res
  24: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_ty
  25: rustc_save_analysis::dump_visitor::DumpVisitor::process_path
  26: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  27: rustc_save_analysis::dump_visitor::DumpVisitor::process_method
  28: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  29: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  30: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item
  31: <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_mod
  32: rustc::dep_graph::graph::DepGraph::with_ignore
  33: rustc_driver::run_compiler::{{closure}}::{{closure}}::{{closure}}
  34: rustc_interface::passes::BoxedGlobalCtxt::access::{{closure}}
  35: rustc_interface::passes::create_global_ctxt::{{closure}}
  36: rustc_interface::interface::run_compiler_in_existing_thread_pool
  37: std::thread::local::LocalKey<T>::with
  38: scoped_tls::ScopedKey<T>::set
  39: syntax::with_globals
note: Some details are omitted, run with `RUST_BACKTRACE=full` for a verbose backtrace.

note: the compiler unexpectedly panicked. this is a bug.

note: we would appreciate a bug report: https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md#bug-reports

note: rustc 1.40.0-nightly (518deda77 2019-10-18) running on x86_64-apple-darwin

note: compiler flags: -C debuginfo=2 --crate-type lib

note: some of the compiler flags provided by cargo are hidden

query stack during panic:
end of query stack

```

</details>

---
**@Xanewok** commented on 2019-10-20T17:07:22Z

I can't reproduce as of `rustc 1.40.0-nightly (c23a7aa77 2019-10-19)` - @Walther could you please update and try again? Recently another save-analysis PR has made its way through so it's possible that it's fixed in the new release.

---
**@Walther** commented on 2019-10-21T18:49:57Z

Yep, could not reproduce on `rustc 1.40.0-nightly (c23a7aa77 2019-10-19)`! good work 👍 Sorry for  the  late reply

---
**@naim94a** commented on 2019-10-21T20:14:04Z

I got a similar error (and rustc crash) when using rls.
Rust: `rustc 1.40.0-nightly (7979016af 2019-10-20)`
RLS: `rls 1.39.0 (a18df16 2019-10-11)`

### Error from rls: `rls --cli`
```
{"message":"src/librustc/ty/context.rs:207: node type <T>::Stream (hir_id=HirId { owner: DefIndex(351), local_id: 7 }) with HirId::owner DefId(0:351 ~ tokio_postgres[f364]::config[0]::{{impl}}[1]::connect[0]::{{opaque}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:350 ~ tokio_postgres[f364]::config[0]::{{impl}}[1]::connect[0])","code":null,"level":"error: internal compiler error","spans":[],"children":[],"rendered":"\^[[0m\^[[1m\^[[38;5;9merror: internal compiler error\^[[0m\^[[0m\^[[1m: src/librustc/ty/context.rs:207: node type <T>::Stream (hir_id=HirId { owner: DefIndex(351), local_id: 7 }) with HirId::owner DefId(0:351 ~ tokio_postgres[f364]::config[0]::{{impl}}[1]::connect[0]::{{opaque}}[0]) cannot be placed in TypeckTables with local_id_root DefId(0:350 ~ tokio_postgres[f364]::config[0]::{{impl}}[1]::connect[0])\^[[0m\n\n"}
thread 'rustc' panicked at 'Box<Any>', src/librustc_errors/lib.rs:925:9
stack backtrace:
   0:     0x7f2430374fa4 - backtrace::backtrace::libunwind::trace::hc456a3386f914390
                               at /cargo/registry/src/github.com-1ecc6299db9ec823/backtrace-0.3.37/src/backtrace/libunwind.rs:88
   1:     0x7f2430374fa4 - backtrace::backtrace::trace_unsynchronized::h4a2def0c1d55554e
                               at /cargo/registry/src/github.com-1ecc6299db9ec823/backtrace-0.3.37/src/backtrace/mod.rs:66
   2:     0x7f2430374fa4 - std::sys_common::backtrace::_print_fmt::hf14ed68b6789b5fe
                               at src/libstd/sys_common/backtrace.rs:77
   3:     0x7f2430374fa4 - <std::sys_common::backtrace::_print::DisplayBacktrace as core::fmt::Display>::fmt::h6c47cffeeb327f7c
                               at src/libstd/sys_common/backtrace.rs:61
   4:     0x7f24303ad43c - core::fmt::write::hc59b451f5f876e7f
                               at src/libcore/fmt/mod.rs:1028
   5:     0x7f2430369247 - std::io::Write::write_fmt::ha233981d002c27e5
                               at src/libstd/io/mod.rs:1412
   6:     0x7f24303797ce - std::sys_common::backtrace::_print::hd01a0af84eb70ff6
                               at src/libstd/sys_common/backtrace.rs:65
   7:     0x7f24303797ce - std::sys_common::backtrace::print::h53f5322cbc293596
                               at src/libstd/sys_common/backtrace.rs:50
   8:     0x7f24303797ce - std::panicking::default_hook::{{closure}}::h0c7c40ba4f45458a
                               at src/libstd/panicking.rs:189
   9:     0x7f24303794d1 - std::panicking::default_hook::h03ff9eee3bf4dec0
                               at src/libstd/panicking.rs:206
  10:     0x7f24308775a3 - rustc_driver::report_ice::h0f63131b378c9f3b
  11:     0x7f2430379fac - std::panicking::rust_panic_with_hook::h07f06d6e0c8f4f10
                               at src/libstd/panicking.rs:473
  12:     0x7f24327759cd - std::panicking::begin_panic::h9d7394ea5657f31a
  13:     0x7f2432772803 - rustc_errors::HandlerInner::bug::h42e6c5a943eba4bc
  14:     0x7f243277149a - rustc_errors::Handler::bug::h376b0abf7c9f7a41
  15:     0x7f2431f297d3 - rustc::util::bug::opt_span_bug_fmt::{{closure}}::h52340496b0034c16
  16:     0x7f2431f19313 - rustc::ty::context::tls::with_opt::{{closure}}::hcc725a99a1df5481
  17:     0x7f2431f19063 - rustc::ty::context::tls::with_context_opt::h60475b0bf5b43fd2
  18:     0x7f2431f190a7 - rustc::ty::context::tls::with_opt::hb075469837d6ec1a
  19:     0x7f2431f296e8 - rustc::util::bug::opt_span_bug_fmt::h23ae4df70c7b8e17
  20:     0x7f2431f29652 - rustc::util::bug::bug_fmt::h77732941ee774d20
  21:     0x7f243237f386 - rustc::ty::context::validate_hir_id_for_typeck_tables::{{closure}}::h1bf14353a76241ad
  22:     0x7f2432394c99 - rustc::ty::context::tls::with::{{closure}}::h089dc1cbbef8a4dc                                                                                  23:     0x7f2432394c70 - rustc::ty::context::tls::with_context::{{closure}}::hda71ce779aa7316b                                                                          24:     0x7f2432393748 - rustc::ty::context::tls::with_context_opt::h20358a2772868641                                                                                   25:     0x7f2432393756 - rustc::ty::context::tls::with_context::hd3735f2af3f9cea3                                                                                       26:     0x7f2432394c86 - rustc::ty::context::tls::with::h30c911537cc4d084                                                                                               27:     0x7f243237fd93 - rustc::ty::context::TypeckTables::qpath_res::h2650b62724d822ec
  28:     0x7f24317fffc7 - rustc_save_analysis::SaveContext::get_path_res::h0334538ea7a16a84
  29:     0x7f243184f32d - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_ty::h620a82e83b71e293
  30:     0x7f243183ba2e - syntax::visit::walk_generic_args::h9977243a2d32688f
  31:     0x7f243184f392 - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_ty::h620a82e83b71e293
  32:     0x7f243183cc89 - syntax::visit::walk_ty::h33897830231a7d8f
  33:     0x7f243183ba2e - syntax::visit::walk_generic_args::h9977243a2d32688f
  34:     0x7f243184f392 - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_ty::h620a82e83b71e293
  35:     0x7f243184334f - rustc_save_analysis::dump_visitor::DumpVisitor::process_method::hd5d868bf2db2b388
  36:     0x7f243184a8c2 - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item::h3387f7ee37ffcd43
  37:     0x7f243184ab0a - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_item::h3387f7ee37ffcd43
  38:     0x7f2431847c9a - <rustc_save_analysis::dump_visitor::DumpVisitor as syntax::visit::Visitor>::visit_mod::h8e63e82b0c6a6f6d
  39:     0x7f24308c5047 - rustc::dep_graph::graph::DepGraph::with_ignore::h5ef3b489b7cf03fd
  40:     0x7f243085a5a0 - rustc_driver::run_compiler::{{closure}}::{{closure}}::{{closure}}::h5a2366d537f2594f
  41:     0x7f243084e785 - rustc_interface::passes::BoxedGlobalCtxt::access::{{closure}}::had036633395585f0
  42:     0x7f243096ec6a - rustc_interface::passes::create_global_ctxt::{{closure}}::h400c23d6ed07e01c
  43:     0x7f243087cee9 - rustc_interface::interface::run_compiler_in_existing_thread_pool::hb3c093a30d377a9b
  44:     0x7f2430890e02 - std::thread::local::LocalKey<T>::with::ha82e71cbf0ba6f43
  45:     0x7f243087968e - scoped_tls::ScopedKey<T>::set::h8a6696f5f7574b9a
  46:     0x7f24308af364 - syntax::with_globals::h9b1a343d709bf576
  47:     0x7f24308b44e2 - std::sys_common::backtrace::__rust_begin_short_backtrace::h510bf3be4fd5ed7b
  48:     0x7f243038a86a - __rust_maybe_catch_panic
                               at src/libpanic_unwind/lib.rs:80
  49:     0x7f24308c1849 - core::ops::function::FnOnce::call_once{{vtable.shim}}::h75ba1b1af60e09af
  50:     0x7f243035b29f - <alloc::boxed::Box<F> as core::ops::function::FnOnce<A>>::call_once::h7a4c92527aa5f8de
                               at /rustc/7979016aff545f7b41cc517031026020b340989d/src/liballoc/boxed.rs:942
  51:     0x7f2430389270 - <alloc::boxed::Box<F> as core::ops::function::FnOnce<A>>::call_once::h05f01d3e2aed4be6
                               at /rustc/7979016aff545f7b41cc517031026020b340989d/src/liballoc/boxed.rs:942
  51:     0x7f2430389270 - <alloc::boxed::Box<F> as core::ops::function::FnOnce<A>>::call_once::h05f01d3e2aed4be6                                                [0/887]                               at /rustc/7979016aff545f7b41cc517031026020b340989d/src/liballoc/boxed.rs:942
  52:     0x7f2430389270 - std::sys_common::thread::start_thread::heb20c5306076e966
                               at src/libstd/sys_common/thread.rs:13
  53:     0x7f2430389270 - std::sys::unix::thread::Thread::new::thread_start::h2d893a9b84fa7c6f
                               at src/libstd/sys/unix/thread.rs:79
  54:     0x7f24302ccfa3 - start_thread
  55:     0x7f24301e14cf - clone
  56:                0x0 - <unknown>

note: the compiler unexpectedly panicked. this is a bug.                                                                                                                
note: we would appreciate a bug report: https://github.com/rust-lang/rust/blob/master/CONTRIBUTING.md#bug-reports                                                       
note: rustc 1.40.0-nightly (7979016af 2019-10-20) running on x86_64-unknown-linux-gnu

note: compiler flags: -C debuginfo=2 --crate-type lib

note: some of the compiler flags provided by cargo are hidden

query stack during panic:
end of query stack
{"message":"aborting due to previous error","code":null,"level":"error","spans":[],"children":[],"rendered":"\^[[0m\^[[1m\^[[38;5;9merror\^[[0m\^[[0m\^[[1m: aborting due to previous error\^[[0m\n\n"}
{"jsonrpc":"2.0","method":"textDocument/publishDiagnostics","params":{"diagnostics":[{"message":"could not compile `tokio-postgres`.\nprocess didn't exit successfully:
`/home/naim/.rustup/toolchains/nightly-x86_64-unknown-linux-gnu/bin/rls --edition=2018 --crate-name tokio_postgres /home/naim/.cargo/registry/src/github.com-1ecc6299db9ec823/tokio-postgres-0.5.0-alpha.1/src/lib.rs --json=diagnostic-rendered-ansi --crate-type lib --emit=dep-info,metadata -C debuginfo=2 --cfg 'feature=\"default\"' --cfg 'feature=\"runtime\"' -C metadata=aa41584653f31878 -C extra-filename=-aa41584653f31878 --out-dir /home/naim/Projects/test/target/rls/debug/deps -L dependency=/home/naim/Projects/test/target/rls/debug/deps --extern bytes=/home/naim/Projects/test/target/rls/debug/deps/libbytes-c5f3d2710cde8058.rmeta --extern fallible_iterator=/home/naim/Projects/test/target/rls/debug/deps/libfallible_iterator-1e40a46ec2bf9c54.rmeta --extern futures=/home/naim/Projects/test/target/rls/debug/deps/libfutures-0a33e1cbc182f4fc.rmeta --extern log=/home/naim/Projects/test/target/rls/debug/deps/liblog-8cd4873c5e13f87d.rmeta --extern parking_lot=/home/naim/Projects/test/target/rls/debug/deps/libparking_lot-72f4d230f0b923e9.rmeta --extern percent_encoding=/home/naim/Projects/test/target/rls/debug/deps/libpercent_encoding-65edd9af765fbe29.rmeta --extern phf=/home/naim/Projects/test/target/rls/debug/deps/libphf-f0a5b1a9fbac9310.rmeta --extern pin_project=/home/naim/Projects/test/target/rls/debug/deps/libpin_project-a4775134cec7c295.rmeta --extern pin_utils=/home/naim/Projects/test/target/rls/debug/deps/libpin_utils-02a71be11439df54.rmeta --extern postgres_protocol=/home/naim/Projects/test/target/rls/debug/deps/libpostgres_protocol-126cc527cdb3df04.rmeta --extern postgres_types=/home/naim/Projects/test/target/rls/debug/deps/libpostgres_types-ec7a8daa42a58e39.rmeta --extern tokio=/home/naim/Projects/test/target/rls/debug/deps/libtokio-ee1804fafb97bbd6.rmeta --cap-lints allow --error-format=json --sysroot /home/naim/.rustup/toolchains/nightly-x86_64-unknown-linux-gnu` (exit code: 101)","range":{"end":{"character":0,"line":9999},"start":{"character":0,"line":0}},"severity":1}],"uri":"file:///home/naim/Projects/test/Cargo.toml"}}                                                                                                               
```

### Cargo.toml
```
[package]
name = "tst"
version = "0.1.0"
authors = ["naim"]
edition = "2018"

[dependencies]
tokio-postgres = "0.5.0-alpha.1"
```
