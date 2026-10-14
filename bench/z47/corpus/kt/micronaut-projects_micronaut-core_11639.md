### Expected Behavior

_No response_

### Actual Behaviour

We are using Micronaut `MdcPropagationContext` for our propagation context. We are initializing it and propagating it in the first server filter.
We also update this by adding new key-value pairs and also update the existing ones from multiple places mentioned below.
1. In the HttpServerFilter
2. In the HttpClientFilter

Our application has multiple declarative API clients to make calls to integrations and we are updating only a single key in the HttpClientFilter. So, when multiple integration calls are made, the same key will be updated by multiple filters within a single server request to the API. 
This works perfectly fine under low TPS. But, when the application is subjected to high TPS, we are seeing a strange behavior where in it is throwing `java.lang.ArrayIndexOutOfBoundsException: Index 21 out of bounds for length 21`.
But, When we moved updating that particular key's value in the `MdcPropagationContext` from the HttpClientFilter to the HttpServerFilter, we did not see any exception thrown.
We suspected this could be a race condition and also tried making the update of the key's value in the MdcPropagationContext a synchronized operation, but we still observe the same behavior.

We would definitely appreciate any help to find out what is causing the issue and how to fix it.

### Steps To Reproduce

_No response_

### Environment Information

_No response_

### Example Application

_No response_

### Version

4.7.5
