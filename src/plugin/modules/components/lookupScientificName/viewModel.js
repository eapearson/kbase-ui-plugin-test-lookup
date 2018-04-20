define([
    'knockout',
    'kb_ko/KO',
    'kb_ko/lib/viewModelBase'
], function (
    ko,
    KO,
    ViewModelBase
) {
    'use strict';

    function parseSearchExpression(input) {
        let parts = input.split(/ +/);
        if (parts.length === 1) {
            return {
                genus: parts[0],
                species: null,
                strain: null
            };
        } else if (parts.length === 2) {
            return {
                genus: parts[0],
                species: parts[1],
                strain: null
            };
        } else if (parts.length > 2) {
            return {
                genus: parts[0],
                species: parts[1],
                strain: parts.slice(2).join(' ')
            };
        }
        return null;
    }

    class Focusser {
        constructor() {
        }

        setElement(element) {
            this.element = element;
        }

        focus() {
            if (!this.element) {
                return;
            }
            this.element.focus();
        }

    }

    class ViewModel extends ViewModelBase {

        constructor(params) {
            super(params);

            // import params
            this.inputValue = params.inputValue;
            // datasource is an object with the method "search"...
            this.dataSources = params.dataSources;

            this.inputValueFocusser = new Focusser();

            this.loading = ko.observable(false);
            // var searchRegexp = ko.pureComputed(function () {
            //     if (!inputValue() || inputValue().length < 2) {
            //         return null;
            //     }
            //     return new RegExp(inputValue(), 'i');
            // });
            this.searchExpression = ko.pureComputed(() => {
                if (!this.inputValue() || this.inputValue().length < 2) {
                    return null;
                }
                return parseSearchExpression(this.inputValue());
            });

            this.tooManyResults = ko.observable(false);
            this.searchCount = ko.observable();
            this.totalCount = ko.observable();
            this.lookupField = null;

            let lastSearchExpression = parseSearchExpression('');

            this.subscribe(this.searchExpression, (newSearchExpression) => {
                this.isSearching(true);

                let dataSource;
                let searchInput;

                // Determine which lookup to use. This is based on which field is being "edited".
                // In the simple case, it is just the right-most term.
                // However, it may also be that the user is going back to edit a prior field, in 
                // which case we look for a change in a field. This is the universal way.
                let field;
                let fields = ['genus', 'species', 'strain'];
                for (var i = 0; i < fields.length; i += 1) {
                    var fieldName = fields[i];
                    console.log('hmm', fieldName, newSearchExpression[fieldName], lastSearchExpression[fieldName]);
                    if (newSearchExpression[fieldName] && newSearchExpression[fieldName] !== lastSearchExpression[fieldName]) {
                        field = fieldName;
                        break;
                    }
                }
                lastSearchExpression = newSearchExpression;
                if (!field) {
                    return null;
                }
               

                if (this.lookupField !== field) {
                    this.searchedValues.removeAll();
                }
                this.lookupField = field;
                dataSource = this.dataSources[field];
                searchInput = newSearchExpression[field];


                // if (newSearchExpression.strain) {
                //     if (this.lookupField !== 'strain') {
                //         this.searchedValues.removeAll();
                //     }
                //     this.lookupField = 'strain';
                //     dataSource = this.dataSources.strain;
                //     searchInput = newSearchExpression.strain;
                // } else if (newSearchExpression.species) {
                //     if (this.lookupField !== 'species') {
                //         this.searchedValues.removeAll();
                //     }
                //     this.lookupField = 'species';
                //     dataSource = this.dataSources.species;
                //     searchInput = newSearchExpression.species;
                // } else if (newSearchExpression.genus) {
                //     if (this.lookupField !== 'genus') {
                //         this.searchedValues.removeAll();
                //     }
                //     this.lookupField = 'genus';
                //     dataSource = this.dataSources.genus;
                //     searchInput = newSearchExpression.genus;
                // } else {
                //     return null;
                // }
                dataSource.totalCount()
                    .then((result) => {
                        this.totalCount(result);
                        if (!newSearchExpression) {
                            return null;
                        }
                        return dataSource.search(searchInput);
                    })
                    .then((result) => {
                        this.isSearching(false);

                        // no input, just reset the control
                        if (result === null) {
                            this.searchedValues.removeAll();
                            this.searchCount(null);
                            return;
                        }                    
                        this.searchCount(result.length);

                        // don't attempt to render with many many results because
                        // (a) it affects performance of the control 
                        // (b) a lookup/typeahead is not useful if you need to scroll through so many items!
                        if (result.length > 200) {
                            this.searchedValues.removeAll();
                            this.tooManyResults(true);
                            return;
                        }
                        this.tooManyResults(false);
                        if (result.length === 0) {
                            this.searchedValues.removeAll();
                            return;
                        }

                        var changes = [];
                        var currentPos = 0,
                            resultPos = 0,
                            done = false;
                        while (!done) {
                            if (currentPos === this.searchedValues().length) {
                                if (resultPos === result.length) {
                                    // if at end, we are done
                                    done = true;
                                    break;
                                } else {
                                    // otheriwse we are past the end of the existing search results, 
                                    // so add one and move along the results (but not searchvalues).
                                    changes.push({
                                        op: 'add',
                                        value: result[resultPos],
                                        at: currentPos
                                    });
                                    resultPos += 1;
                                }
                            } else {
                                if (resultPos === result.length) {
                                    // if we are at the end of the results, but have 
                                    // more in our current buffer, just delete from
                                    // the current buffer.
                                    changes.push({
                                        op: 'delete',
                                        at: currentPos
                                    });
                                    currentPos += 1;
                                } else {
                                    // ah, here is the magic, we need an ordering property, which is an integer (number)
                                    var comp = this.searchedValues()[currentPos].order - result[resultPos].order;
                                    if (comp > 0) {
                                        // a value before this one is now available, insert it
                                        // before this one.
                                        changes.push({
                                            op: 'insert',
                                            value: result[resultPos],
                                            at: currentPos
                                        });
                                        resultPos += 1;
                                    } else if (comp < 0) {
                                        // the current item is before the results item, so it needs to be removed.
                                        changes.push({
                                            op: 'delete',
                                            at: currentPos
                                        });
                                        currentPos += 1;
                                    } else {
                                        // otherwise they are the same, so just continue walking both.
                                        currentPos += 1;
                                        resultPos += 1;
                                    }
                                }
                            }
                        }
                        let adj = 0;
                        changes.forEach((change) => {
                            let value;
                            switch (change.op) {
                            case 'delete':
                                this.searchedValues.splice(change.at + adj, 1);
                                adj -= 1;
                                break;
                            case 'add':
                                value = change.value;
                                value.active = ko.observable(false);
                                this.searchedValues.splice(change.at + adj + 1, 0, value);
                                adj += 1;
                                break;
                            case 'insert':
                                value = change.value;
                                value.active = ko.observable(false);
                                this.searchedValues.splice(change.at + adj, 0, value);
                                adj += 1;
                                break;
                            }
                        });
                    })
                    .catch((err) => {
                        this.isSearching(false);
                        console.error('show error!', err);
                    });
            });
            this.searchedValues = ko.observableArray();

            this.itemSelected = ko.observable(false);

            // Don't start out with the search populated.
            if (this.inputValue() && this.inputValue().length > 0) {
                this.itemSelected(true);
            }

            this.subscribe(this.inputValue, () => {
                this.itemSelected(false);
            });

            this.userHasModified = ko.pureComputed(() => {
                return (this.inputValue.isDirty() && !this.itemSelected());
            });

            this.isSearching = ko.observable(false);

            this.mode = ko.pureComputed(() => {
                if (this.isSearching()) {
                    return 'searching';
                }
                if (this.searchedValues().length > 0) {
                    if (this.userHasModified()) {
                        return 'canselect';
                    } else {
                        return 'cansearch';
                    }
                } else {
                    return 'cansearch';
                }
            });
            this.showingAll = ko.observable(false);
        }

        doSelectValue(selected) {
            // the selected label now takes the place 
            // of the current position in the input value.
            let parsed = parseSearchExpression(this.inputValue());
            switch (this.lookupField) {
            case 'genus':
                parsed.genus = selected.label;
                break;
            case 'species': 
                parsed.species = selected.label;
                break;
            case 'strain':
                parsed.strain = selected.label;
                break;
            default:
                console.warn('hmm', this.lookupField, selected, parsed);
            }
            
            let newInput = [parsed.genus, parsed.species, parsed.strain]
                .filter((item) => {
                    return item ? true : false;
                })
                .join(' ');

            if (this.lookupField !== 'strain') {
                newInput += ' ';
            }

            this.inputValue(newInput);
            this.inputValue.markClean();
            this.inputValueFocusser.focus();

            this.itemSelected(true);
            this.showingAll(false);
        }

        doActivate(selected) {
            selected.active(true);
        }

        doDeactivate(selected) {
            selected.active(false);
        }

        doCancelSearch() {
            this.inputValue.markClean();
        }

        // handle user clicking the search button.
        // if not searching, should invoke a search against whatever is in the field;
        // if the field is empty it will show everything.
        // if is searching, should close the search selection and mark the field as clean.
        // how to tell if searching? --- maybe just with the dirty flag on the input? try it.
        doToggleSearch() {
            if (this.inputValue.isDirty()) {
                this.inputValue.markClean();
            } else {
                this.inputValue.markDirty();
            }
        }

        onInputKeyup(data, ev) {
            if (ev.key === 'Escape') {
                this.inputValue.markClean();
            }
        }
    }
    
    return ViewModel;
});