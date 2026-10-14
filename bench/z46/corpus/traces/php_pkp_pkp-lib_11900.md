**Description:**
When attempting to delete a submission, the following exception is raised:

```php
PDOException: SQLSTATE[23000]: Integrity constraint violation: 1451 Cannot delete or update a parent row: a foreign key constraint fails (`ore`.`publication_galleys`, CONSTRAINT `publication_galleys_submission_file_id_foreign` FOREIGN KEY (`submission_file_id`) REFERENCES `submission_files` (`submission_file_id`)) in /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php:596
--
Stack trace:
#0 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php(596): PDOStatement->execute()
#1 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php(812): Illuminate\Database\Connection->Illuminate\Database\{closure}()
#2 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php(779): Illuminate\Database\Connection->runQueryCallback()
#3 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php(584): Illuminate\Database\Connection->run()
#4 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Connection.php(548): Illuminate\Database\Connection->affectingStatement()
#5 /var/www/html/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php(4024): Illuminate\Database\Connection->delete()
#6 /var/www/html/lib/pkp/classes/core/EntityDAO.php(233): Illuminate\Database\Query\Builder->delete()
#7 /var/www/html/lib/pkp/classes/submissionFile/DAO.php(238): PKP\core\EntityDAO->deleteById()
#8 /var/www/html/lib/pkp/classes/core/EntityDAO.php(221): PKP\submissionFile\DAO->deleteById()
#9 /var/www/html/lib/pkp/classes/submissionFile/DAO.php(219): PKP\core\EntityDAO->_delete()
#10 /var/www/html/lib/pkp/classes/submissionFile/Repository.php(488): PKP\submissionFile\DAO->delete()
#11 /var/www/html/classes/submissionFile/Repository.php(62): PKP\submissionFile\Repository->delete()
#12 /var/www/html/lib/pkp/classes/galley/Repository.php(204): APP\submissionFile\Repository->delete()
#13 /var/www/html/classes/publication/Repository.php(234): PKP\galley\Repository->delete()
#14 /var/www/html/lib/pkp/classes/submission/DAO.php(259): APP\publication\Repository->delete()
#15 /var/www/html/classes/submission/DAO.php(34): PKP\submission\DAO->deleteById()
#16 /var/www/html/lib/pkp/classes/core/EntityDAO.php(221): APP\submission\DAO->deleteById()
#17 /var/www/html/lib/pkp/classes/submission/DAO.php(243): PKP\core\EntityDAO->_delete()
#18 /var/www/html/lib/pkp/classes/submission/Repository.php(655): PKP\submission\DAO->delete()
#19 /var/www/html/index.php(30): PKP\submission\Repository->delete()
#20 {main}
```

The `publication_galleys.submission_file_id` references a "sub-entity", just like the `submission.current_publication_id`, so when removing the sub-entity it's needed to first clear the reference.

**Solution:**
- To follow the current pattern, we should update the delete rule of the `publication_galleys.submission_file_id` to `SET NULL`.
- A migration script should be executed for all the affected versions (probably starting at 3.4)
- A proper fix should enclose the delete operation at the parent entity with a transaction, otherwise we risk leaving an orphaned galley (a galley without a file reference)


**What application are you using?**
OJS 3.6
