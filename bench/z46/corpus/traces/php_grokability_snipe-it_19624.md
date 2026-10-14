### Snipe-IT Version

v8.7.2

### PHP Version

PHP 8.3.6 (cli) (built: Jul 16 2026 18:30:41) (NTS) Copyright (c) The PHP Group Zend Engine v4.3.6, Copyright (c) Zend Technologies     with Zend OPcache v8.3.6, Copyright (c), by Zend Technologies

### Composer Version

Composer version 2.10.2 2026-07-01 11:24:45 PHP version 8.3.6 (/usr/bin/php8.3)

### MySQL/MariaDB version

mysql  Ver 8.0.46-0ubuntu0.24.04.3 for Linux on x86_64 ((Ubuntu))

### How did you install Snipe-IT?

Docker

### Is this a fresh install or an upgrade?

Fresh install

### What happened?

Hi

I have an old snipeit installation and tried to migrate it to a fresh docker install from a backup file.

First thing: I had to increase the max upload file size from the default 2M to 100M so I could upload my 50MB backup zip.

Second, actual error: When attempting to restore from backup, snipeit tries to generate a safety backup (of my empty installation) beforehand and fails. It looks like the snipeit backup tries to run `mariadb-dump`. The docker-compose file actually creates a mariadb container. However, the snipeit container has no mariadb installation but mysql cli. Which means it cannot find the `mariadb-dump` executable.
I can make it work by creating a symlink via `ln -s /usr/bin/mysqldump /usr/bin/mariadb-dump` though that's only a hack and no fix. I attached the error message below

Kind regards

```
root@e11aa7efcce6:/var/www/html# php artisan snipeit:backup
Starting backup...
Dumping database snipeit...
Backup failed because: The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
.
#0 /var/www/html/vendor/spatie/db-dumper/src/DbDumper.php(200): Spatie\DbDumper\Exceptions\DumpFailed::processDidNotEndSuccessfully()
#1 /var/www/html/vendor/spatie/db-dumper/src/Databases/MySql.php(189): Spatie\DbDumper\DbDumper->checkIfDumpWasSuccessFul()
#2 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(289): Spatie\DbDumper\Databases\MySql->dumpToFile()
#3 [internal function]: Spatie\Backup\Tasks\Backup\BackupJob->Spatie\Backup\Tasks\Backup\{closure}()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Arr.php(841): array_map()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Collection.php(829): Illuminate\Support\Arr::map()
#6 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(259): Illuminate\Support\Collection->map()
#7 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(198): Spatie\Backup\Tasks\Backup\BackupJob->dumpDatabases()
#8 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(172): Spatie\Backup\Tasks\Backup\BackupJob->createBackupManifest()
#9 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BackupCommand.php(72): Spatie\Backup\Tasks\Backup\BackupJob->run()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Spatie\Backup\Commands\BackupCommand->handle()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#16 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#18 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BaseCommand.php(29): Illuminate\Console\Command->run()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(68): Spatie\Backup\Commands\BaseCommand->run()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(29): Illuminate\Console\Command->runCommand()
#21 /var/www/html/app/Console/Commands/SystemBackup.php(56): Illuminate\Console\Command->call()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\Console\Commands\SystemBackup->handle()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#27 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#28 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#30 /var/www/html/vendor/symfony/console/Application.php(1117): Illuminate\Console\Command->run()
#31 /var/www/html/vendor/symfony/console/Application.php(356): Symfony\Component\Console\Application->doRunCommand()
#32 /var/www/html/vendor/symfony/console/Application.php(195): Symfony\Component\Console\Application->doRun()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): Symfony\Component\Console\Application->run()
#34 /var/www/html/artisan(33): Illuminate\Foundation\Console\Kernel->handle()
#35 {main}
Backup failed because: The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
.
[2026-09-04 17:00:12] production.ERROR: Spatie\DbDumper\Exceptions\DumpFailed: The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
 in /var/www/html/vendor/spatie/db-dumper/src/Exceptions/DumpFailed.php:14
Stack trace:
#0 /var/www/html/vendor/spatie/db-dumper/src/DbDumper.php(200): Spatie\DbDumper\Exceptions\DumpFailed::processDidNotEndSuccessfully()
#1 /var/www/html/vendor/spatie/db-dumper/src/Databases/MySql.php(189): Spatie\DbDumper\DbDumper->checkIfDumpWasSuccessFul()
#2 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(289): Spatie\DbDumper\Databases\MySql->dumpToFile()
#3 [internal function]: Spatie\Backup\Tasks\Backup\BackupJob->Spatie\Backup\Tasks\Backup\{closure}()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Arr.php(841): array_map()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Collection.php(829): Illuminate\Support\Arr::map()
#6 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(259): Illuminate\Support\Collection->map()
#7 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(198): Spatie\Backup\Tasks\Backup\BackupJob->dumpDatabases()
#8 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(172): Spatie\Backup\Tasks\Backup\BackupJob->createBackupManifest()
#9 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BackupCommand.php(72): Spatie\Backup\Tasks\Backup\BackupJob->run()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Spatie\Backup\Commands\BackupCommand->handle()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#16 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#18 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BaseCommand.php(29): Illuminate\Console\Command->run()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(68): Spatie\Backup\Commands\BaseCommand->run()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(29): Illuminate\Console\Command->runCommand()
#21 /var/www/html/app/Console/Commands/SystemBackup.php(56): Illuminate\Console\Command->call()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\Console\Commands\SystemBackup->handle()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#27 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#28 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#30 /var/www/html/vendor/symfony/console/Application.php(1117): Illuminate\Console\Command->run()
#31 /var/www/html/vendor/symfony/console/Application.php(356): Symfony\Component\Console\Application->doRunCommand()
#32 /var/www/html/vendor/symfony/console/Application.php(195): Symfony\Component\Console\Application->doRun()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): Symfony\Component\Console\Application->run()
#34 /var/www/html/artisan(33): Illuminate\Foundation\Console\Kernel->handle()
#35 {main}

Next Spatie\Backup\Exceptions\BackupFailed: The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
 in /var/www/html/vendor/spatie/laravel-backup/src/Exceptions/BackupFailed.php:17
Stack trace:
#0 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(186): Spatie\Backup\Exceptions\BackupFailed::from()
#1 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BackupCommand.php(72): Spatie\Backup\Tasks\Backup\BackupJob->run()
#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Spatie\Backup\Commands\BackupCommand->handle()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#8 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#10 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BaseCommand.php(29): Illuminate\Console\Command->run()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(68): Spatie\Backup\Commands\BaseCommand->run()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(29): Illuminate\Console\Command->runCommand()
#13 /var/www/html/app/Console/Commands/SystemBackup.php(56): Illuminate\Console\Command->call()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\Console\Commands\SystemBackup->handle()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\Container\BoundMethod::Illuminate\Container\{closure}()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\Container\Util::unwrapIfClosure()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\Container\BoundMethod::callBoundMethod()
#18 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\Container\BoundMethod::call()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\Container\Container->call()
#20 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\Console\Command->execute()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\Component\Console\Command\Command->run()
#22 /var/www/html/vendor/symfony/console/Application.php(1117): Illuminate\Console\Command->run()
#23 /var/www/html/vendor/symfony/console/Application.php(356): Symfony\Component\Console\Application->doRunCommand()
#24 /var/www/html/vendor/symfony/console/Application.php(195): Symfony\Component\Console\Application->doRun()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): Symfony\Component\Console\Application->run()
#26 /var/www/html/artisan(33): Illuminate\Foundation\Console\Kernel->handle()
#27 {main}  
[2026-09-04 17:00:12] production.ERROR: The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
 {"exception":"[object] (Spatie\\Backup\\Exceptions\\BackupFailed(code: 0): The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
 at /var/www/html/vendor/spatie/laravel-backup/src/Exceptions/BackupFailed.php:17)
[stacktrace]
#0 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(186): Spatie\\Backup\\Exceptions\\BackupFailed::from()
#1 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BackupCommand.php(72): Spatie\\Backup\\Tasks\\Backup\\BackupJob->run()
#2 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Spatie\\Backup\\Commands\\BackupCommand->handle()
#3 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod()
#6 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\\Container\\BoundMethod::call()
#7 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\\Container\\Container->call()
#8 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\\Console\\Command->execute()
#9 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\\Component\\Console\\Command\\Command->run()
#10 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BaseCommand.php(29): Illuminate\\Console\\Command->run()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(68): Spatie\\Backup\\Commands\\BaseCommand->run()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(29): Illuminate\\Console\\Command->runCommand()
#13 /var/www/html/app/Console/Commands/SystemBackup.php(56): Illuminate\\Console\\Command->call()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\\Console\\Commands\\SystemBackup->handle()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()
#16 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod()
#18 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\\Container\\BoundMethod::call()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\\Container\\Container->call()
#20 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\\Console\\Command->execute()
#21 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\\Component\\Console\\Command\\Command->run()
#22 /var/www/html/vendor/symfony/console/Application.php(1117): Illuminate\\Console\\Command->run()
#23 /var/www/html/vendor/symfony/console/Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand()
#24 /var/www/html/vendor/symfony/console/Application.php(195): Symfony\\Component\\Console\\Application->doRun()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): Symfony\\Component\\Console\\Application->run()
#26 /var/www/html/artisan(33): Illuminate\\Foundation\\Console\\Kernel->handle()
#27 {main}

[previous exception] [object] (Spatie\\DbDumper\\Exceptions\\DumpFailed(code: 0): The dump process failed with a none successful exitcode.
Exitcode
========
127: Command not found

Output
======
<no output>

Error Output
============
sh: 1: /usr/bin/mariadb-dump: not found
 at /var/www/html/vendor/spatie/db-dumper/src/Exceptions/DumpFailed.php:14)
[stacktrace]
#0 /var/www/html/vendor/spatie/db-dumper/src/DbDumper.php(200): Spatie\\DbDumper\\Exceptions\\DumpFailed::processDidNotEndSuccessfully()
#1 /var/www/html/vendor/spatie/db-dumper/src/Databases/MySql.php(189): Spatie\\DbDumper\\DbDumper->checkIfDumpWasSuccessFul()
#2 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(289): Spatie\\DbDumper\\Databases\\MySql->dumpToFile()
#3 [internal function]: Spatie\\Backup\\Tasks\\Backup\\BackupJob->Spatie\\Backup\\Tasks\\Backup\\{closure}()
#4 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Arr.php(841): array_map()
#5 /var/www/html/vendor/laravel/framework/src/Illuminate/Collections/Collection.php(829): Illuminate\\Support\\Arr::map()
#6 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(259): Illuminate\\Support\\Collection->map()
#7 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(198): Spatie\\Backup\\Tasks\\Backup\\BackupJob->dumpDatabases()
#8 /var/www/html/vendor/spatie/laravel-backup/src/Tasks/Backup/BackupJob.php(172): Spatie\\Backup\\Tasks\\Backup\\BackupJob->createBackupManifest()
#9 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BackupCommand.php(72): Spatie\\Backup\\Tasks\\Backup\\BackupJob->run()
#10 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): Spatie\\Backup\\Commands\\BackupCommand->handle()
#11 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()
#12 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure()
#13 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod()
#14 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\\Container\\BoundMethod::call()
#15 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\\Container\\Container->call()
#16 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\\Console\\Command->execute()
#17 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\\Component\\Console\\Command\\Command->run()
#18 /var/www/html/vendor/spatie/laravel-backup/src/Commands/BaseCommand.php(29): Illuminate\\Console\\Command->run()
#19 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(68): Spatie\\Backup\\Commands\\BaseCommand->run()
#20 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Concerns/CallsCommands.php(29): Illuminate\\Console\\Command->runCommand()
#21 /var/www/html/app/Console/Commands/SystemBackup.php(56): Illuminate\\Console\\Command->call()
#22 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(36): App\\Console\\Commands\\SystemBackup->handle()
#23 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Util.php(43): Illuminate\\Container\\BoundMethod::Illuminate\\Container\\{closure}()
#24 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(96): Illuminate\\Container\\Util::unwrapIfClosure()
#25 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/BoundMethod.php(35): Illuminate\\Container\\BoundMethod::callBoundMethod()
#26 /var/www/html/vendor/laravel/framework/src/Illuminate/Container/Container.php(799): Illuminate\\Container\\BoundMethod::call()
#27 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(211): Illuminate\\Container\\Container->call()
#28 /var/www/html/vendor/symfony/console/Command/Command.php(341): Illuminate\\Console\\Command->execute()
#29 /var/www/html/vendor/laravel/framework/src/Illuminate/Console/Command.php(180): Symfony\\Component\\Console\\Command\\Command->run()
#30 /var/www/html/vendor/symfony/console/Application.php(1117): Illuminate\\Console\\Command->run()
#31 /var/www/html/vendor/symfony/console/Application.php(356): Symfony\\Component\\Console\\Application->doRunCommand()
#32 /var/www/html/vendor/symfony/console/Application.php(195): Symfony\\Component\\Console\\Application->doRun()
#33 /var/www/html/vendor/laravel/framework/src/Illuminate/Foundation/Console/Kernel.php(198): Symfony\\Component\\Console\\Application->run()
#34 /var/www/html/artisan(33): Illuminate\\Foundation\\Console\\Kernel->handle()
#35 {main}
"} 
```

### What browsers are you seeing the problem on?

_No response_

### Can you reproduce this on the public demo?

N/A

### Do you have full multiple company support enabled?

No

### If you have full multiple company support enabled, do you have location scoping to company enabled?

I do not have full multiple company support enabled

### Application log output

```shell

```

### Browser console output

```shell

```

### Common Issues

- [x] I have searched this repo for existing issues related to my issue (including closed issues)
- [x] My APP_URL is set correctly in my .env file (including http or https and no trailing slash)
- [x] I have searched the official Snipe-IT documentation and have checked the Common Issues documentation (where applicable)
- [x] I have run database migrations (where applicable).
- [x] I have attached screenshots and/or videos of the issue (where applicable)

### Code of Conduct

- [x] I agree to follow this project's Code of Conduct
