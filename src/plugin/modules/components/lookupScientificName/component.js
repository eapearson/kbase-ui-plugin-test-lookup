define([
    'kb_ko/KO',
    './viewModel',
    './template'
], function (
    KO,
    ViewModel,
    template
) {
    'use strict';

    function component() {
        return {
            viewModel: ViewModel,
            template: template()
        };
    }
    
    return KO.registerComponent(component);
});