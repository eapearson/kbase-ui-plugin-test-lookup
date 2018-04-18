define([
    'kb_common/html'
], function (
    html
) {
    'use strict';

    var t = html.tag,
        div = t('div'),
        span = t('span'),
        input = t('input');

    function template() {
        return div({
            style: {},
            class: 'typeaheadInput'
        }, [
            '<style>.typeaheadInput .-row.-active {  background-color: silver; }</style>',
            div({
                dataBind: {
                    if: 'loading()'
                }
            }, html.loading()),
            div({
                dataBind: {
                    ifnot: 'loading()'
                }
            }, [
                div({
                    class: 'input-group'
                }, [
                    input({
                        class: 'form-control',
                        dataBind: {
                            value: 'inputValue',
                            valueUpdate: '"input"',
                            event: {
                                keyup: '$component.onInputKeyup'
                            }
                        }
                    }),
                    span({
                        class: 'input-group-addon fa',
                        dataBind: {
                            visible: 'mode() !== "canselect"',
                            css: {
                                '"fa-search"': 'mode() === "cansearch"',
                                '"fa-spinner fa-pulse fa-fw"': 'mode() === "searching"',
                            },
                            click: 'doToggleSearch'
                        }
                    }),
                    span({
                        class: 'input-group-addon fa fa-times',
                        style: {
                            cursor: 'pointer'
                        },
                        dataBind: {
                            click: 'doCancelSearch',
                            visible: 'mode() === "canselect"'
                        }
                    })
                ]),
                div({
                    dataBind: {
                        if: 'mode() === "canselect"'
                    },
                    style: {
                        position: 'relative',
                        width: '100%'
                    }
                }, [
                    div({
                        style: {
                            position: 'relative',
                            borderTop: '1px silver solid',
                            borderLeft: '1px silver solid',
                            borderRight: '1px silver solid',
                            backgroundColor: '#EEE',
                            zIndex: '100',
                            padding: '4px',
                            width: '100%'
                        }
                    }, [
                        'Found ',
                        span({
                            dataBind: {
                                text: 'searchCount'
                            }
                        }),
                        ' out of ',
                        span({
                            dataBind: {
                                text: 'totalCount'
                            }
                        })
                    ]),
                    div({
                        dataBind: {
                            foreach: 'searchedValues'
                        },
                        style: {
                            border: '1px silver solid',
                            backgroundColor: 'white',
                            zIndex: '100',
                            position: 'absolute',
                            width: '100%',
                            maxHeight: '10em',
                            overflow: 'auto'
                        }
                    }, div({
                        class: '-row',
                        style: {
                            padding: '4px',
                            cursor: 'pointer'
                        },
                        dataBind: {
                            text: 'label',
                            click: 'function(d,e) {$component.doSelectValue.call($component,d,e);}',
                            style: {
                                '"background-color"': 'active() ? "silver" : "transparent"'
                            },
                            // css: '{"-active": active()}',

                            event: {
                                mouseover: 'function(d,e) {$component.doActivate.call($component,d,e);}',
                                mouseout: 'function(d,e) {$component.doDeactivate.call($component,d,e);}'
                            }
                        }
                    }))
                ]),
                div({
                    class: 'text-warning',
                    style: {
                        fontStyle: 'italic'
                    },
                    dataBind: {
                        if: 'tooManyResults()'
                    }
                }, [
                    'Too many matches (',
                    span({ dataBind: { text: 'searchCount' } }),
                    ') to display -- please enter more in order to narrow your results.'
                ]),
                div({
                    style: {
                        fontStyle: 'italic'
                    },
                    dataBind: {
                        if: '!tooManyResults() && searchedValues().length === 0 && inputValue() && inputValue().length < 2'
                    }
                }, [
                    'Please enter two or more letters above to search for your research or educational organization. '
                ]),
                div({
                    style: {
                        fontStyle: 'italic'
                    },
                    dataBind: {
                        if: '!tooManyResults() && searchedValues().length === 0 && userHasModified() && inputValue().length >= 2'
                    }
                }, [
                    'Nothing matched your entry. You may leave it as is to use this value in your profile, ',
                    'or try different text to match your organization.'
                ])
            ])
        ]);
    }
   
    return template;
});