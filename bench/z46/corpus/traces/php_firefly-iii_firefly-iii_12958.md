### Support guidelines

- [x] I'm smart and I read the <!-- MZ2udTpin6FL --> [support guidelines](https://github.com/firefly-iii/firefly-iii/blob/main/.github/support.md)

### Use of AI

- [x] I'm a real person and wrote this bug without assistance from AI.

### I've found a bug and checked that ...

- [x] ... [the documentation](https://docs.firefly-iii.org/) does not mention anything about my problem
- [x] ... there are no open or closed issues that are related to my problem
- [x] ... it's [definitely a Firefly III issue, not me](https://github.com/firefly-iii/firefly-iii/blob/main/.github/its_you_not_me.md)

### Description

When trying to click the Clear Cache button in System Settings, I hit a 500 Internal Error 

I am deploying Firefly v6.7.4 on Docker Swarm. 
The APP_KEY is loaded from a Docker Swarm secret using APP_KEY_FILE. Logs show that the file is read and the value is 32 characters long 

```
APP_KEY will be set from APP_KEY_FILE
DB_PASSWORD will be set from DB_PASSWORD_FILE
```

Firefly has been working perfectly since the start of the year and the rest of the app still functions fine
The entire app will continue to Error after hitting this issue


Below is the container log for this Internal Server Error
```
10.0.2.13 - - [02/Oct/2026:16:45:39 +0100] "GET /manifest.webmanifest?v=3e8AboOwbd HTTP/1.1" 200 2347 "https://firefly.domain/flush" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36" "192.168.86.1"
[2026-10-02 16:45:39] production.ERROR: No application encryption key has been specified.  
[02-Oct-2026 16:45:39 Europe/London] PHP Fatal error:  Uncaught Illuminate\Encryption\MissingAppKeyException: No application encryption key has been specified. in /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php:83
Stack trace:
#0 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/helpers.php(393): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::key():81}()
#1 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(81): tap()
#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(64): Illuminate\Encryption\EncryptionServiceProvider->key()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(32): Illuminate\Encryption\EncryptionServiceProvider->parseKey()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::registerEncrypter():29}()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#8 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(219): Illuminate\Container\Container->offsetGet()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(199): Illuminate\Session\SessionManager->buildEncryptedSession()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(80): Illuminate\Session\SessionManager->buildSession()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(68): Illuminate\Session\SessionManager->createNativeDriver()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(105): Illuminate\Session\SessionManager->createFileDriver()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(82): Illuminate\Support\Manager->createDriver()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionServiceProvider.php(52): Illuminate\Support\Manager->driver()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Session\SessionServiceProvider->{closure:Illuminate\Session\SessionServiceProvider::registerSessionDriver():48}()
#18 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(132): Illuminate\Container\Container->offsetGet()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(100): Illuminate\Auth\AuthManager->createSessionDriver()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(74): Illuminate\Auth\AuthManager->resolve()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(348): Illuminate\Auth\AuthManager->guard()
#27 /var/www/html/app/Exceptions/Handler.php(237): Illuminate\Auth\AuthManager->__call()
#28 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(1049): FireflyIII\Exceptions\Handler->report()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(961): Illuminate\Foundation\Exceptions\Handler->renderHttpException()
#30 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(844): Illuminate\Foundation\Exceptions\Handler->prepareResponse()
#31 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(731): Illuminate\Foundation\Exceptions\Handler->renderExceptionResponse()
#32 /var/www/html/app/Exceptions/Handler.php(218): Illuminate\Foundation\Exceptions\Handler->render()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(228): FireflyIII\Exceptions\Handler->render()
#34 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(205): Illuminate\Foundation\Bootstrap\HandleExceptions->renderHttpResponse()
#35 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(265): Illuminate\Foundation\Bootstrap\HandleExceptions->handleException()
#36 [internal function]: Illuminate\Foundation\Bootstrap\HandleExceptions->{closure:Illuminate\Foundation\Bootstrap\HandleExceptions::forwardsTo():264}()
#37 {main}
  thrown in /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php on line 83
[2026-10-02 16:45:39] production.ERROR: Uncaught Illuminate\Encryption\MissingAppKeyException: No application encryption key has been specified. in /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php:83
Stack trace:
#0 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/helpers.php(393): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::key():81}()
#1 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(81): tap()
#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(64): Illuminate\Encryption\EncryptionServiceProvider->key()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(32): Illuminate\Encryption\EncryptionServiceProvider->parseKey()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::registerEncrypter():29}()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#8 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(219): Illuminate\Container\Container->offsetGet()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(199): Illuminate\Session\SessionManager->buildEncryptedSession()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(80): Illuminate\Session\SessionManager->buildSession()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(68): Illuminate\Session\SessionManager->createNativeDriver()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(105): Illuminate\Session\SessionManager->createFileDriver()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(82): Illuminate\Support\Manager->createDriver()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionServiceProvider.php(52): Illuminate\Support\Manager->driver()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Session\SessionServiceProvider->{closure:Illuminate\Session\SessionServiceProvider::registerSessionDriver():48}()
#18 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(132): Illuminate\Container\Container->offsetGet()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(100): Illuminate\Auth\AuthManager->createSessionDriver()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(74): Illuminate\Auth\AuthManager->resolve()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(348): Illuminate\Auth\AuthManager->guard()
#27 /var/www/html/app/Exceptions/Handler.php(237): Illuminate\Auth\AuthManager->__call()
#28 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(1049): FireflyIII\Exceptions\Handler->report()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(961): Illuminate\Foundation\Exceptions\Handler->renderHttpException()
#30 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(844): Illuminate\Foundation\Exceptions\Handler->prepareResponse()
#31 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(731): Illuminate\Foundation\Exceptions\Handler->renderExceptionResponse()
#32 /var/www/html/app/Exceptions/Handler.php(218): Illuminate\Foundation\Exceptions\Handler->render()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(228): FireflyIII\Exceptions\Handler->render()
#34 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(205): Illuminate\Foundation\Bootstrap\HandleExceptions->renderHttpResponse()
#35 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(265): Illuminate\Foundation\Bootstrap\HandleExceptions->handleException()
#36 [internal function]: Illuminate\Foundation\Bootstrap\HandleExceptions->{closure:Illuminate\Foundation\Bootstrap\HandleExceptions::forwardsTo():264}()
#37 {main}
  thrown  
[02-Oct-2026 16:45:39 Europe/London] PHP Fatal error:  Uncaught Illuminate\Encryption\MissingAppKeyException: No application encryption key has been specified. in /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php:83
Stack trace:
#0 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/helpers.php(393): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::key():81}()
#1 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(81): tap()
#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(64): Illuminate\Encryption\EncryptionServiceProvider->key()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php(32): Illuminate\Encryption\EncryptionServiceProvider->parseKey()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Encryption\EncryptionServiceProvider->{closure:Illuminate\Encryption\EncryptionServiceProvider::registerEncrypter():29}()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#8 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(219): Illuminate\Container\Container->offsetGet()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(199): Illuminate\Session\SessionManager->buildEncryptedSession()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(80): Illuminate\Session\SessionManager->buildSession()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionManager.php(68): Illuminate\Session\SessionManager->createNativeDriver()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(105): Illuminate\Session\SessionManager->createFileDriver()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Support/Manager.php(82): Illuminate\Support\Manager->createDriver()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Session/SessionServiceProvider.php(52): Illuminate\Support\Manager->driver()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1140): Illuminate\Session\SessionServiceProvider->{closure:Illuminate\Session\SessionServiceProvider::registerSessionDriver():48}()
#18 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(939): Illuminate\Container\Container->build()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1085): Illuminate\Container\Container->resolve()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(867): Illuminate\Foundation\Application->resolve()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Application.php(1065): Illuminate\Container\Container->make()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(1846): Illuminate\Foundation\Application->make()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(132): Illuminate\Container\Container->offsetGet()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(100): Illuminate\Auth\AuthManager->createSessionDriver()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(74): Illuminate\Auth\AuthManager->resolve()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Auth/AuthManager.php(348): Illuminate\Auth\AuthManager->guard()
#27 /var/www/html/app/Exceptions/Handler.php(237): Illuminate\Auth\AuthManager->__call()
#28 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(1049): FireflyIII\Exceptions\Handler->report()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(961): Illuminate\Foundation\Exceptions\Handler->renderHttpException()
#30 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(844): Illuminate\Foundation\Exceptions\Handler->prepareResponse()
#31 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Exceptions/Handler.php(731): Illuminate\Foundation\Exceptions\Handler->renderExceptionResponse()
#32 /var/www/html/app/Exceptions/Handler.php(218): Illuminate\Foundation\Exceptions\Handler->render()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(228): FireflyIII\Exceptions\Handler->render()
#34 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(205): Illuminate\Foundation\Bootstrap\HandleExceptions->renderHttpResponse()
#35 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(241): Illuminate\Foundation\Bootstrap\HandleExceptions->handleException()
#36 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php(265): Illuminate\Foundation\Bootstrap\HandleExceptions->handleShutdown()
#37 [internal function]: Illuminate\Foundation\Bootstrap\HandleExceptions->{closure:Illuminate\Foundation\Bootstrap\HandleExceptions::forwardsTo():264}()
#38 {main}
  thrown in /var/www/html/vendor/laravel/framework/src/Illuminate/Encryption/EncryptionServiceProvider.php on line 83
```

### Debug information

N/A

### Steps to reproduce

1. Deploy Firefly-III to docker using docker compose
2. Create and delete transactions 
3. Hit Clear Cache to clear out removed data
4. Error page

### Additional info

_No response_
