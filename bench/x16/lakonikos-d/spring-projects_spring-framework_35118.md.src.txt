SpringBoot version: 3.5.0
Hibernate Version: 6.6.15.Final

When i use native image to package my project.I compile successed.
But when i run it.
Give this fail message:
```plaintext
Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'entityManagerFactory': org.hibernate.bytecode.spi.BytecodeProvider: Provider org.hibernate.bytecode.internal.bytebuddy.BytecodeProviderImpl not found
```

more logs:
```plaintext
2025-06-27T16:31:07.413+08:00  INFO 33417 --- [ChainOS-User] [           main] o.hibernate.jpa.internal.util.LogHelper  : HHH000204: Processing PersistenceUnitInfo [name: default]
2025-06-27T16:31:07.414+08:00  INFO 33417 --- [ChainOS-User] [           main] org.hibernate.Version                    : HHH000412: Hibernate ORM core version 6.6.15.Final
2025-06-27T16:31:07.416+08:00  INFO 33417 --- [ChainOS-User] [           main] o.h.c.internal.RegionFactoryInitiator    : HHH000026: Second-level cache disabled
2025-06-27T16:31:07.419+08:00  INFO 33417 --- [ChainOS-User] [           main] com.zaxxer.hikari.HikariDataSource       : ChainOS-User-HikariPool - Starting...
2025-06-27T16:31:07.547+08:00  INFO 33417 --- [ChainOS-User] [           main] com.zaxxer.hikari.pool.HikariPool        : ChainOS-User-HikariPool - Added connection org.postgresql.jdbc.PgConnection@41b49605
2025-06-27T16:31:07.547+08:00  INFO 33417 --- [ChainOS-User] [           main] com.zaxxer.hikari.HikariDataSource       : ChainOS-User-HikariPool - Start completed.
2025-06-27T16:31:07.576+08:00  INFO 33417 --- [ChainOS-User] [           main] org.hibernate.orm.connections.pooling    : HHH10001005: Database info:
	Database JDBC URL [Connecting through datasource 'HikariDataSource (ChainOS-User-HikariPool)']
	Database driver: undefined/unknown
	Database version: 17.4
	Autocommit mode: undefined/unknown
	Isolation level: undefined/unknown
	Minimum pool size: undefined/unknown
	Maximum pool size: undefined/unknown
2025-06-27T16:31:07.587+08:00  WARN 33417 --- [ChainOS-User] [           main] w.s.c.ServletWebServerApplicationContext : Exception encountered during context initialization - cancelling refresh attempt: org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'entityManagerFactory': org.hibernate.bytecode.spi.BytecodeProvider: Provider org.hibernate.bytecode.internal.bytebuddy.BytecodeProviderImpl not found
2025-06-27T16:31:07.587+08:00  INFO 33417 --- [ChainOS-User] [           main] com.zaxxer.hikari.HikariDataSource       : ChainOS-User-HikariPool - Shutdown initiated...
2025-06-27T16:31:07.587+08:00  INFO 33417 --- [ChainOS-User] [           main] com.zaxxer.hikari.HikariDataSource       : ChainOS-User-HikariPool - Shutdown completed.
Application run failed
org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'entityManagerFactory': org.hibernate.bytecode.spi.BytecodeProvider: Provider org.hibernate.bytecode.internal.bytebuddy.BytecodeProviderImpl not found
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.initializeBean(AbstractAutowireCapableBeanFactory.java:1826)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.doCreateBean(AbstractAutowireCapableBeanFactory.java:607)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.createBean(AbstractAutowireCapableBeanFactory.java:529)
	at org.springframework.beans.factory.support.AbstractBeanFactory.lambda$doGetBean$0(AbstractBeanFactory.java:339)
	at org.springframework.beans.factory.support.DefaultSingletonBeanRegistry.getSingleton(DefaultSingletonBeanRegistry.java:373)
	at org.springframework.beans.factory.support.AbstractBeanFactory.doGetBean(AbstractBeanFactory.java:337)
	at org.springframework.beans.factory.support.AbstractBeanFactory.getBean(AbstractBeanFactory.java:207)
	at org.springframework.context.support.AbstractApplicationContext.finishBeanFactoryInitialization(AbstractApplicationContext.java:970)
	at org.springframework.context.support.AbstractApplicationContext.refresh(AbstractApplicationContext.java:627)
	at org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext.refresh(ServletWebServerApplicationContext.java:146)
	at org.springframework.boot.SpringApplication.refresh(SpringApplication.java:753)
	at org.springframework.boot.SpringApplication.refreshContext(SpringApplication.java:439)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:318)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1362)
	at org.springframework.boot.SpringApplication.run(SpringApplication.java:1351)
	at cn.trendai.chain.os.user.interfaces.ChainOsUserApplication.main(ChainOsUserApplication.java:26)
	at java.base@21.0.7/java.lang.invoke.LambdaForm$DMH/sa346b79c.invokeStaticInit(LambdaForm$DMH)
Caused by: java.util.ServiceConfigurationError: org.hibernate.bytecode.spi.BytecodeProvider: Provider org.hibernate.bytecode.internal.bytebuddy.BytecodeProviderImpl not found
	at java.base@21.0.7/java.util.ServiceLoader.fail(ServiceLoader.java:593)
	at java.base@21.0.7/java.util.ServiceLoader$LazyClassPathLookupIterator.nextProviderClass(ServiceLoader.java:1219)
	at java.base@21.0.7/java.util.ServiceLoader$LazyClassPathLookupIterator.hasNextService(ServiceLoader.java:1228)
	at java.base@21.0.7/java.util.ServiceLoader$LazyClassPathLookupIterator.hasNext(ServiceLoader.java:1273)
	at java.base@21.0.7/java.util.ServiceLoader$2.hasNext(ServiceLoader.java:1309)
	at java.base@21.0.7/java.util.ServiceLoader$ProviderSpliterator.tryAdvance(ServiceLoader.java:1491)
	at java.base@21.0.7/java.util.Spliterators$1Adapter.hasNext(Spliterators.java:681)
	at org.hibernate.boot.registry.classloading.internal.AggregatedServiceLoader$ClassPathAndModulePathAggregatedServiceLoader.loadAll(AggregatedServiceLoader.java:123)
	at org.hibernate.boot.registry.classloading.internal.AggregatedServiceLoader$ClassPathAndModulePathAggregatedServiceLoader.getAll(AggregatedServiceLoader.java:112)
	at org.hibernate.boot.registry.classloading.internal.ClassLoaderServiceImpl.loadJavaServices(ClassLoaderServiceImpl.java:241)
	at org.hibernate.bytecode.internal.BytecodeProviderInitiator.initiateService(BytecodeProviderInitiator.java:51)
	at org.hibernate.bytecode.internal.BytecodeProviderInitiator.initiateService(BytecodeProviderInitiator.java:22)
	at org.hibernate.boot.registry.internal.StandardServiceRegistryImpl.initiateService(StandardServiceRegistryImpl.java:130)
	at org.hibernate.service.internal.AbstractServiceRegistryImpl.createService(AbstractServiceRegistryImpl.java:263)
	at org.hibernate.service.internal.AbstractServiceRegistryImpl.initializeService(AbstractServiceRegistryImpl.java:238)
	at org.hibernate.service.internal.AbstractServiceRegistryImpl.getService(AbstractServiceRegistryImpl.java:215)
	at org.hibernate.boot.internal.SessionFactoryBuilderImpl.<init>(SessionFactoryBuilderImpl.java:70)
	at org.hibernate.boot.internal.SessionFactoryBuilderImpl.<init>(SessionFactoryBuilderImpl.java:47)
	at org.hibernate.boot.internal.DefaultSessionFactoryBuilderService.createSessionFactoryBuilder(DefaultSessionFactoryBuilderService.java:26)
	at org.hibernate.boot.internal.MetadataImpl.getSessionFactoryBuilder(MetadataImpl.java:175)
	at org.hibernate.jpa.boot.internal.EntityManagerFactoryBuilderImpl.build(EntityManagerFactoryBuilderImpl.java:1513)
	at org.springframework.orm.jpa.vendor.SpringHibernateJpaPersistenceProvider.createContainerEntityManagerFactory(SpringHibernateJpaPersistenceProvider.java:66)
	at org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean.createNativeEntityManagerFactory(LocalContainerEntityManagerFactoryBean.java:390)
	at org.springframework.orm.jpa.AbstractEntityManagerFactoryBean.buildNativeEntityManagerFactory(AbstractEntityManagerFactoryBean.java:419)
	at org.springframework.orm.jpa.AbstractEntityManagerFactoryBean.afterPropertiesSet(AbstractEntityManagerFactoryBean.java:400)
	at org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean.afterPropertiesSet(LocalContainerEntityManagerFactoryBean.java:366)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.invokeInitMethods(AbstractAutowireCapableBeanFactory.java:1873)
	at org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.initializeBean(AbstractAutowireCapableBeanFactory.java:1822)
	... 16 more
```


