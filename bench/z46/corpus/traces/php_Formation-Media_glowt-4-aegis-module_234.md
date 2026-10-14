# There's been an error on https://aegis.4.glowt.co.uk/ajax/m/AEGIS/customers/add_customer.

| Detail  | Value
| ------- | -
| Version | 2.0.2
| Message | SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'KIN001' for key 'm_aegis_scopes_reference_unique' (SQL: insert into `m_aegis_scopes` (`added_by`, `name`, `reference`, `updated_at`, `created_at`) values (370, Kinshofer GmbH, KIN001, 2026-10-07 13:23:56, 2026-10-07 13:23:56))
| File    | /vendor/laravel/framework/src/Illuminate/Database/Connection.php
| Line    | 760
## Request
```
{
    "name": "Kinshofer GmbH",
    "_GET": {
        "module": "AEGIS",
        "feature": "projects",
        "page": "add",
        "id": null
    }
}
```
## Trace
```
#0 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Connection.php(720): Illuminate\Database\Connection->runQueryCallback()
#1 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Connection.php(546): Illuminate\Database\Connection->run()
#2 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Connection.php(498): Illuminate\Database\Connection->statement()
#3 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Query/Processors/Processor.php(32): Illuminate\Database\Connection->insert()
#4 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php(3322): Illuminate\Database\Query\Processors\Processor->processInsertGetId()
#5 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Builder.php(1869): Illuminate\Database\Query\Builder->insertGetId()
#6 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php(1330): Illuminate\Database\Eloquent\Builder->__call()
#7 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php(1295): Illuminate\Database\Eloquent\Model->insertAndSetId()
#8 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php(1138): Illuminate\Database\Eloquent\Model->performInsert()
#9 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/modules/AEGIS/Models/Customer.php(47): Illuminate\Database\Eloquent\Model->save()
#10 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Builder.php(986): Modules\AEGIS\Models\Customer->save()
#11 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Support/helpers.php(306): Illuminate\Database\Eloquent\Builder->Illuminate\Database\Eloquent\{closure}()
#12 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Builder.php(987): tap()
#13 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Support/Traits/ForwardsCalls.php(23): Illuminate\Database\Eloquent\Builder->create()
#14 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php(2330): Illuminate\Database\Eloquent\Model->forwardCallTo()
#15 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Database/Eloquent/Model.php(2342): Illuminate\Database\Eloquent\Model->__call()
#16 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/modules/AEGIS/Http/Controllers/Ajax/CustomersController.php(18): Illuminate\Database\Eloquent\Model::__callStatic()
#17 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Controller.php(54): Modules\AEGIS\Http\Controllers\Ajax\CustomersController->add_customer()
#18 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/routes/web.php(141): Illuminate\Routing\Controller->callAction()
#19 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/CallableDispatcher.php(40): Illuminate\Routing\RouteFileRegistrar->{closure}()
#20 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Route.php(237): Illuminate\Routing\CallableDispatcher->dispatch()
#21 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Route.php(208): Illuminate\Routing\Route->runCallable()
#22 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Router.php(798): Illuminate\Routing\Route->run()
#23 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(141): Illuminate\Routing\Router->Illuminate\Routing\{closure}()
#24 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/app/Http/Middleware/RequestConversion.php(33): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#25 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): App\Http\Middleware\RequestConversion->handle()
#26 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/app/Http/Middleware/RequestIsAjax.php(19): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#27 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): App\Http\Middleware\RequestIsAjax->handle()
#28 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Middleware/SubstituteBindings.php(50): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#29 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Routing\Middleware\SubstituteBindings->handle()
#30 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Auth/Middleware/Authenticate.php(44): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#31 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Auth\Middleware\Authenticate->handle()
#32 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/VerifyCsrfToken.php(78): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#33 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Middleware\VerifyCsrfToken->handle()
#34 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/View/Middleware/ShareErrorsFromSession.php(49): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#35 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\View\Middleware\ShareErrorsFromSession->handle()
#36 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Session/Middleware/StartSession.php(121): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#37 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Session/Middleware/StartSession.php(64): Illuminate\Session\Middleware\StartSession->handleStatefulRequest()
#38 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Session\Middleware\StartSession->handle()
#39 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Cookie/Middleware/AddQueuedCookiesToResponse.php(37): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#40 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse->handle()
#41 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Cookie/Middleware/EncryptCookies.php(67): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#42 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Cookie\Middleware\EncryptCookies->handle()
#43 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(116): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#44 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Router.php(799): Illuminate\Pipeline\Pipeline->then()
#45 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Router.php(776): Illuminate\Routing\Router->runRouteWithinStack()
#46 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Router.php(740): Illuminate\Routing\Router->runRoute()
#47 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Routing/Router.php(729): Illuminate\Routing\Router->dispatchToRoute()
#48 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(190): Illuminate\Routing\Router->dispatch()
#49 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(141): Illuminate\Foundation\Http\Kernel->Illuminate\Foundation\Http\{closure}()
#50 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TransformsRequest.php(21): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#51 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/ConvertEmptyStringsToNull.php(31): Illuminate\Foundation\Http\Middleware\TransformsRequest->handle()
#52 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull->handle()
#53 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TransformsRequest.php(21): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#54 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TrimStrings.php(40): Illuminate\Foundation\Http\Middleware\TransformsRequest->handle()
#55 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Middleware\TrimStrings->handle()
#56 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/ValidatePostSize.php(27): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#57 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Middleware\ValidatePostSize->handle()
#58 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/PreventRequestsDuringMaintenance.php(86): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#59 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance->handle()
#60 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/fruitcake/laravel-cors/src/HandleCors.php(38): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#61 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Fruitcake\Cors\HandleCors->handle()
#62 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Http/Middleware/TrustProxies.php(39): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#63 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Http\Middleware\TrustProxies->handle()
#64 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/app/Http/Middleware/Settings.php(19): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#65 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): App\Http\Middleware\Settings->handle()
#66 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(116): Illuminate\Pipeline\Pipeline->Illuminate\Pipeline\{closure}()
#67 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(165): Illuminate\Pipeline\Pipeline->then()
#68 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(134): Illuminate\Foundation\Http\Kernel->sendRequestThroughRouter()
#69 /var/www/vhosts/4.glowt.co.uk/ACCOUNTS/aegis/public/index.php(52): Illuminate\Foundation\Http\Kernel->handle()
#70 {main}
```

