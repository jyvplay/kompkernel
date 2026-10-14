### Database Type

MS SQLServer

### Database Version

MS SQLServer 2008 R2

### Druid Version

1.2.24

### JDK Version

JDK8

### Error SQL

select * from [test1@1];

### Testcase Code

```java
// case1
String sql = "select * from [test1@1];";
List<SQLStatement> stmtList = SQLUtils.parseStatements(sql, JdbcConstants.MYSQL);
System.out.println(stmtList);

// case2
String sql = "select * from [test1@1];";
List<SQLStatement> stmtList = SQLUtils.parseStatements(sql, JdbcConstants.SQL_SERVER);
System.out.println(stmtList);
```

### Stacktrace Info

```log
case1:

Exception in thread "main" com.alibaba.druid.sql.parser.ParserException: syntax error. pos 22, line 1, column 21, token VARIANT
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlExprParser.primaryRest(MySqlExprParser.java:1499)
	at com.alibaba.druid.sql.parser.SQLExprParser.primary(SQLExprParser.java:1291)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlExprParser.primary(MySqlExprParser.java:1241)
	at com.alibaba.druid.sql.parser.SQLExprParser.expr(SQLExprParser.java:110)
	at com.alibaba.druid.sql.parser.SQLExprParser.exprList(SQLExprParser.java:2245)
	at com.alibaba.druid.sql.parser.SQLExprParser.exprList(SQLExprParser.java:2226)
	at com.alibaba.druid.sql.parser.SQLExprParser.primary(SQLExprParser.java:1262)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlExprParser.primary(MySqlExprParser.java:1283)
	at com.alibaba.druid.sql.parser.SQLExprParser.expr(SQLExprParser.java:110)
	at com.alibaba.druid.sql.parser.SQLSelectParser.expr(SQLSelectParser.java:2070)
	at com.alibaba.druid.sql.parser.SQLSelectParser.parseTableSourceQueryTableExpr(SQLSelectParser.java:1332)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlSelectParser.parseTableSource(MySqlSelectParser.java:475)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlSelectParser.parseFrom(MySqlSelectParser.java:89)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlSelectParser.query(MySqlSelectParser.java:237)
	at com.alibaba.druid.sql.parser.SQLSelectParser.select(SQLSelectParser.java:77)
	at com.alibaba.druid.sql.dialect.mysql.parser.MySqlStatementParser.parseSelect(MySqlStatementParser.java:120)
	at com.alibaba.druid.sql.parser.SQLStatementParser.parseStatementList(SQLStatementParser.java:232)
	at com.alibaba.druid.sql.SQLUtils.parseStatements(SQLUtils.java:656)
	at com.alibaba.druid.sql.SQLUtils.parseStatements(SQLUtils.java:677)

case2:

Exception in thread "main" java.lang.NoClassDefFoundError: com/google/common/collect/Lists
	at com.alibaba.druid.sql.parser.SQLSelectParser.getReturningFunctions(SQLSelectParser.java:1411)
	at com.alibaba.druid.sql.parser.SQLSelectParser.parseGeneratedTableSource(SQLSelectParser.java:1382)
	at com.alibaba.druid.sql.parser.SQLSelectParser.parseTableSource(SQLSelectParser.java:1292)
	at com.alibaba.druid.sql.parser.SQLSelectParser.parseFrom(SQLSelectParser.java:1166)
	at com.alibaba.druid.sql.dialect.sqlserver.parser.SQLServerSelectParser.query(SQLServerSelectParser.java:160)
	at com.alibaba.druid.sql.parser.SQLSelectParser.query(SQLSelectParser.java:424)
	at com.alibaba.druid.sql.dialect.sqlserver.parser.SQLServerSelectParser.select(SQLServerSelectParser.java:47)
	at com.alibaba.druid.sql.parser.SQLStatementParser.parseSelect(SQLStatementParser.java:4740)
	at com.alibaba.druid.sql.parser.SQLStatementParser.parseStatementList(SQLStatementParser.java:232)
	at com.alibaba.druid.sql.SQLUtils.parseStatements(SQLUtils.java:656)
	at com.alibaba.druid.sql.SQLUtils.parseStatements(SQLUtils.java:677)
	at com.yunnk.jsqlparserdemo.JsqlparserDemoApplication.main(JsqlparserDemoApplication.java:23)
Caused by: java.lang.ClassNotFoundException: com.google.common.collect.Lists
	at java.net.URLClassLoader.findClass(URLClassLoader.java:382)
	at java.lang.ClassLoader.loadClass(ClassLoader.java:424)
	at sun.misc.Launcher$AppClassLoader.loadClass(Launcher.java:349)
	at java.lang.ClassLoader.loadClass(ClassLoader.java:357)
	... 12 more
```

### Error Info

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.18</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>com.example</groupId>
    <artifactId>demo</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>demo</name>
    <description>demo</description>

    <properties>
        <java.version>8</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>2.7.18</version>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <version>2.7.18</version>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>com.alibaba</groupId>
            <artifactId>druid-spring-boot-starter</artifactId>
            <version>1.2.24</version>
        </dependency>

        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-jdbc</artifactId>
        </dependency>

        <!-- MySQL -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <version>8.4.0</version>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

</project>
```
