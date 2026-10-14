### Read the Troubleshooting guide.

- [x] I have read and followed the Troubleshooting guide

### Reproduction steps

1. Install Koel using the official Docker image.
2. Activate a valid, legitimately purchased Koel Plus license.
3. Run Koel from a network where api.lemonsqueezy.com is unreachable (in my case, a server located in Russia).
4. Wait until Koel needs to validate the Plus license again, or trigger functionality that calls the license validation service.
5. Open Koel.

### Expected behavior

Koel should gracefully handle temporary or permanent unavailability of the Lemon Squeezy API.

For an already activated and valid perpetual Plus license, inability to reach the third-party licensing service should not cause the application request to fail.

Possible behavior could be:

continue using the last successfully validated license status and retry validation later;
provide a reasonable grace period;
show a warning that online license validation is currently unavailable;
support an offline/manual validation mechanism for already purchased licenses.

Most importantly, a network error from the licensing provider should not result in an unhandled exception affecting normal Koel usage.

### Actual behavior

Koel attempts to validate the license through:

https://api.lemonsqueezy.com/v1/licenses/validate

The Lemon Squeezy API is unreachable from my server, and the request times out after 10 seconds.

This results in a Saloon\Exceptions\Request\FatalRequestException being propagated through LicenseService::getStatus() / LicenseService::isPlus() and ultimately causes the Koel request to fail.

The license itself is legitimate and was purchased officially. The problem is not an invalid license key, but the inability of the Koel server to communicate with the external license validation service.

This is particularly problematic for existing customers in regions where Lemon Squeezy is no longer reachable or available, because an already purchased perpetual Koel Plus license effectively becomes unusable without routing the server's traffic through another country.

### Logs

Next Saloon\Exceptions\Request\FatalRequestException: cURL error 28: Failed to connect to api.lemonsqueezy.com port 443 after 10000 ms: Timeout was reached (see https://curl.se/libcurl/c/libcurl-errors.html) for https://api.lemonsqueezy.com/v1/licenses/validate in /var/www/html/vendor/saloonphp/saloon/src/Http/Senders/GuzzleSender.php:116
Stack trace:
#0 /var/www/html/vendor/saloonphp/saloon/src/Traits/Connector/SendsRequests.php(72): Saloon\Http\Senders\GuzzleSender->send()
#1 /var/www/html/app/Services/License/LicenseService.php(89): Saloon\Http\Connector->send()
#2 /var/www/html/app/Services/License/LicenseService.php(138): App\Services\License\LicenseService->getStatus()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Facades/Facade.php(363): App\Services\License\LicenseService->isPlus()
#4 /var/www/html/app/Http/Controllers/IndexController.php(18): Illuminate\Support\Facades\Facade::__callStatic()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\Http\Controllers\IndexController->__invoke()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::{closure:Illuminate\Container\BoundMethod::call():35}()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#8 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(66): Illuminate\Container\BoundMethod::call()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(32): Illuminate\Container\BoundMethod::callClass()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#12 /var/www/html/routes/web.base.php(25): Illuminate\Container\Container->call()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/CallableDispatcher.php(39): Illuminate\Routing\RouteFileRegistrar::{closure:{closure:/var/www/html/routes/web.base.php:23}:25}()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Route.php(247): Illuminate\Routing\CallableDispatcher->dispatch()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Route.php(218): Illuminate\Routing\Route->runCallable()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Router.php(822): Illuminate\Routing\Route->run()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Routing\Router->{closure:Illuminate\Routing\Router::runRouteWithinStack():821}()
#18 /var/www/html/vendor/laravel/nightwatch/src/Hooks/RouteMiddleware.php(34): Illuminate\Pipeline\Pipeline->{closure:Illuminate\Pipeline\Pipeline::prepareDestination():178}()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Laravel\Nightwatch\Hooks\RouteMiddleware->handle()
#20 /var/www/html/app/Http/Middleware/ForceHttps.php(28): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): App\Http\Middleware\ForceHttps->handle()
#22 /var/www/html/app/Http/Middleware/HandleDemoMode.php(42): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): App\Http\Middleware\HandleDemoMode->handle()
#24 /var/www/html/app/Http/Middleware/RestrictPlusFeatures.php(30): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): App\Http\Middleware\RestrictPlusFeatures->handle()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Middleware/SubstituteBindings.php(52): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#27 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Routing\Middleware\SubstituteBindings->handle()
#28 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/PreventRequestForgery.php(104): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Foundation\Http\Middleware\PreventRequestForgery->handle()
#30 /var/www/html/vendor/laravel/framework/src/Illuminate/View/Middleware/ShareErrorsFromSession.php(48): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#31 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\View\Middleware\ShareErrorsFromSession->handle()
#32 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/Middleware/StartSession.php(120): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/Middleware/StartSession.php(63): Illuminate\Session\Middleware\StartSession->handleStatefulRequest()
#34 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Session\Middleware\StartSession->handle()
#35 /var/www/html/vendor/laravel/framework/src/Illuminate/Cookie/Middleware/AddQueuedCookiesToResponse.php(36): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#36 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse->handle()
#37 /var/www/html/vendor/laravel/framework/src/Illuminate/Cookie/Middleware/EncryptCookies.php(74): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#38 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Cookie\Middleware\EncryptCookies->handle()
#39 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(137): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#40 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Router.php(821): Illuminate\Pipeline\Pipeline->then()
#41 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Router.php(800): Illuminate\Routing\Router->runRouteWithinStack()
#42 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Router.php(764): Illuminate\Routing\Router->runRoute()
#43 /var/www/html/vendor/laravel/framework/src/Illuminate/Routing/Router.php(753): Illuminate\Routing\Router->dispatchToRoute()
#44 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(200): Illuminate\Routing\Router->dispatch()
#45 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(180): Illuminate\Foundation\Http\Kernel->{closure:Illuminate\Foundation\Http\Kernel::dispatchToRouter():197}()
#46 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TransformsRequest.php(21): Illuminate\Pipeline\Pipeline->{closure:Illuminate\Pipeline\Pipeline::prepareDestination():178}()
#47 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/ConvertEmptyStringsToNull.php(31): Illuminate\Foundation\Http\Middleware\TransformsRequest->handle()
#48 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull->handle()
#49 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TransformsRequest.php(21): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#50 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/TrimStrings.php(51): Illuminate\Foundation\Http\Middleware\TransformsRequest->handle()
#51 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Foundation\Http\Middleware\TrimStrings->handle()
#52 /var/www/html/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php(27): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#53 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Http\Middleware\ValidatePostSize->handle()
#54 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/PreventRequestsDuringMaintenance.php(109): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#55 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance->handle()
#56 /var/www/html/vendor/laravel/framework/src/Illuminate/Http/Middleware/HandleCors.php(61): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#57 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Http\Middleware\HandleCors->handle()
#58 /var/www/html/vendor/laravel/framework/src/Illuminate/Http/Middleware/TrustProxies.php(58): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#59 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Http\Middleware\TrustProxies->handle()
#60 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Middleware/InvokeDeferredCallbacks.php(22): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#61 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Foundation\Http\Middleware\InvokeDeferredCallbacks->handle()
#62 /var/www/html/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePathEncoding.php(28): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#63 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Illuminate\Http\Middleware\ValidatePathEncoding->handle()
#64 /var/www/html/vendor/laravel/nightwatch/src/Hooks/GlobalMiddleware.php(53): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#65 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(219): Laravel\Nightwatch\Hooks\GlobalMiddleware->handle()
#66 /var/www/html/vendor/laravel/framework/src/Illuminate/Pipeline/Pipeline.php(137): Illuminate\Pipeline\Pipeline->{closure:{closure:Illuminate\Pipeline\Pipeline::carry():194}:195}()
#67 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(175): Illuminate\Pipeline\Pipeline->then()
#68 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Http/Kernel.php(144): Illuminate\Foundation\Http\Kernel->sendRequestThroughRouter()
#69 /var/www/html/public/index.php(56): Illuminate\Foundation\Http\Kernel->handle()
#70 {main}  

### Koel version

9.11.0

### How did you install Koel?

Official Docker image

### Additional information

**Installation**: Official phanan/koel Docker image
**Database**: MariaDB 10.11
**Host/server location**: Russia
**License**: Legitimately purchased Koel Plus perpetual license
**Network issue**: api.lemonsqueezy.com:443 cannot be reached from the server
Koel itself and other external/network functionality: working normally
**Additional context**: The issue is specifically caused by the dependency on online Lemon Squeezy validation for an already purchased license.

I understand that availability of Lemon Squeezy itself is outside of Koel's control. The bug report is about how Koel handles the licensing API being unavailable.

Would it be possible to either gracefully fall back to the last successfully validated license status or provide an officially supported offline/manual activation method for existing Plus customers?
