'use strict';

var MutationSummary = require('mutation-summary');

function upgradeMDLComponent(summaries) {
    summaries.forEach(function summaryFn(summary) {
        summary.added.forEach(function addedField(el) {
            componentHandler.upgradeElement(el);
        });
    });
}

module.exports = function upgradeMDL() {
    var observer = new MutationSummary({
      callback: upgradeMDLComponent,
      queries: [
          { element: '.mdl-textfield' },
          { element: '.mdl-button' },
          { element: '.mdl-snackbar' }
      ]
    });

    return observer;
}
