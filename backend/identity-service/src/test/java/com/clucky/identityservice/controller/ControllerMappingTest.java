package com.clucky.identityservice.controller;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.RestController;
import static org.mockito.Mockito.mock;

class ControllerMappingTest {
    @Test
    void controllerRoutesAreUnambiguous() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        var controllers = new java.util.ArrayList<Object>();
        for (var definition : scanner.findCandidateComponents("com.clucky.identityservice.controller")) {
            controllers.add(mock(Class.forName(definition.getBeanClassName())));
        }
        MockMvcBuilders.standaloneSetup(controllers.toArray()).build();
    }
}
