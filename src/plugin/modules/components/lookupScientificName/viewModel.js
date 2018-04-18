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

    class ViewModel extends ViewModelBase {

        constructor(params) {
            super(params);
            // import params

            this.inputValue = params.inputValue;
            // datasource is an object with the method "search"...
            this.dataSources = params.dataSources;
            //console.log('data source', this.dataSource);

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
                console.log('search expr', this.inputValue(),parseSearchExpression(this.inputValue()));
                return parseSearchExpression(this.inputValue());
            });

            this.tooManyResults = ko.observable(false);
            this.searchCount = ko.observable();
            this.totalCount = ko.observable();
            this.lastSearchField = null;

            this.subscribe(this.searchExpression, (newSearchExpression) => {
                this.isSearching(true);

                let dataSource;
                let searchInput;

                if (newSearchExpression.strain) {
                    if (this.lastSearchField !== 'strain') {
                        this.searchedValues.removeAll();
                    }
                    this.lastSearchField = 'strain';
                    dataSource = this.dataSources.strain;
                    searchInput = newSearchExpression.strain;
                } else if (newSearchExpression.species) {
                    if (this.lastSearchField !== 'species') {
                        this.searchedValues.removeAll();
                    }
                    this.lastSearchField = 'species';
                    dataSource = this.dataSources.species;
                    searchInput = newSearchExpression.species;
                } else if (newSearchExpression.genus) {
                    if (this.lastSearchField !== 'genus') {
                        this.searchedValues.removeAll();
                    }
                    this.lastSearchField = 'genus';
                    dataSource = this.dataSources.genus;
                    searchInput = newSearchExpression.genus;
                } else {
                    return null;
                }
                dataSource.totalCount()
                    .then((result) => {
                        this.totalCount(result);
                        if (!newSearchExpression) {
                            return null;
                        }
                        console.log('expr', newSearchExpression);
                        return dataSource.search(searchInput);
                    })
                    .then((result) => {
                        this.isSearching(false);
                        // no input.
                        if (result === null) {
                            this.searchedValues.removeAll();
                            this.searchCount(null);
                            return;
                        }                    
                        this.searchCount(result.length);
                        if (result.length > 200) {
                            this.searchedValues.removeAll();
                            this.tooManyResults(true);
                            return;
                        } else {
                            this.tooManyResults(false);
                        }
                        if (result.length === 0) {
                            this.searchedValues.removeAll();
                            return;
                        }

                        // var current = searchedValues;
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
                            console.log('change', change);
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
            this.inputValue(selected.label);
            this.inputValue.markClean();
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