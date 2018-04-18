define([
    'knockout',
    'bluebird',
    'kb_common/html',
    'json!./lookup-data.json',
    './components/lookupScientificName/component'
], function (
    ko,
    Promise,
    html,
    data,
    LookupScientificNameComponent
) {
    'use strict';

    var t = html.tag,
        p = t('p'),
        ul = t('ul'),
        li = t('li'),
        div = t('div');

    class LookupDataSource {
        constructor(type) {
            this.type = type;
            this.active = ko.observable();
            this.data = data[type].map((item, index) => {
                return {
                    order: index,
                    label: item
                };
            });
        }

        search(input) {
            return Promise.try(() => {
                let matcher = new RegExp(input, 'i');
                let filtered = this.data.filter((item) => {
                    return item.label.match(matcher) ? true : false;
                });
                return filtered;
            });
        }

        totalCount() {
            return Promise.try(() => {
                return this.data.length;
            });
        }
    }

    class ScientificNameLookupDataSource {
        constructor(data) {
            this.data = data.scientificName.map((item, index) => {
                let parts = item.split(' ');
                let value;
                if (parts.length === 2) {
                    value = {
                        genus: parts[0],
                        species: parts[1],
                        strain: null
                    };
                } else if (parts.length === 3) {
                    value = {
                        genus: parts[0],
                        species: parts[1],
                        strain: parts[3]
                    };
                }
                return {                    
                    order: index,
                    value: value,
                    label: item
                };
            });
        }

        search(input) {
            return Promise.try(() => {
                if (!input) {
                    return null;
                }
                let toMatch = input.split(' ');
                if (toMatch.length === 1) {
                    let matcher = new RegExp(toMatch[0], 'i');
                    return this.data.filter((item) => {
                        if (item.value && item.value.genus) {
                            return item.value.genus.match(matcher) ? true : false;
                        } else {
                            return false;
                        }
                    });
                }
            });
        }

        totalCount() {
            return Promise.try(() => {
                return this.data.length;
            });
        }
    }

    class Widget {
        constructor(config) {
            this.runtime = config.runtime;
            this.vm = {
                inputValue: ko.observable().extend({dirty: false}),
                dataSources: {
                    // scientificName: new ScientificNameLookupDataSource(data),
                    genus: new LookupDataSource('genus'),
                    species: new LookupDataSource('species'),
                    strain: new LookupDataSource('strain')
                }
            };
        }

        attach(node) {
            this.hostNode = node;
            this.container = this.hostNode.appendChild(document.createElement('div'));
        }

        start(params) {
            this.container.innerHTML = div([
                p('Hi'),
                p('Categories include:'),
                ul(Object.keys(data).map((key) => {
                    return li(key + ': ' + data[key].length);
                }).join('')),
                div({
                    dataBind: {
                        component: {
                            name: LookupScientificNameComponent.quotedName(),
                            params: {
                                inputValue: 'inputValue',
                                dataSources: 'dataSources'
                            }
                        }
                    }
                })
            ]);
            ko.applyBindings(this.vm, this.container);
        }

        stop() {

        }

        detach() {
            if (this.hostNode && this.container) {
                this.hostNode.removeChild(this.container);
            }
        }
    }

    return Widget;
});