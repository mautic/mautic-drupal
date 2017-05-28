/*
 * Credit to
 * Original JS work forked from drupal.org/webform_prefill module to mautic use case
 */

(function ($) {

    var SessionStorage = function (pfx) {
        this.pfx = pfx;
    };

    SessionStorage.prototype.browserSupport = function () {
        // this is taken from modernizr.
        var mod = 'modernizr';
        try {
            localStorage.setItem(mod, mod);
            localStorage.removeItem(mod);
            return true;
        } catch (e) {
            return false;
        }
    };

    SessionStorage.prototype.setItem = function (key, value) {
        return sessionStorage.setItem(this.pfx + ':' + key, JSON.stringify(value));
    };

    SessionStorage.prototype.getItem = function (key) {
        try {
            var v = sessionStorage.getItem(this.pfx + ':' + key);
            if (v !== null) {
                v = JSON.parse(v);
            }
            return v;
        }
        catch (e) {
            return null;
        }
    };

    SessionStorage.prototype.getFirst = function (keys) {
        // Get value from all possible keys.
        var value = null;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            value = prefillStore.getItem(key);
            if (value) {
                return value;
            }
        }
        return null;
    };

    var prefillStore = new SessionStorage('mauticform_prefill')


    var FormValList = function ($e, name_attr) {
        this.$e = $e;
        this.name_attr = name_attr || 'name';
        this.name = $e.attr(this.name_attr);
        this.cache_key = this.pfxMap(this.name);
    };

    FormValList.prototype.getVal = function () {
        var $e = this.$e;
        var type = $e.attr('type');
        if (type == 'checkbox' || type == 'radio') {
            $e = $e.closest('form').find('input:' + type + '[' + this.name_attr + '="' + this.name + '"]:checked');
        }
        var val = $e.val() || [];
        return (val.constructor === Array) ? val : [val];
    };

    FormValList.prototype.getAllByName = function () {
        return this.$e.closest('form')
            .find('[' + this.name_attr + '="' + this.name + '"]')
            .filter('input:checkbox, input:radio, select[multiple]');
    };

    FormValList.prototype.pfxMap = function (x) {
        return 'l:' + x;
    }

    var FormValSingle = function ($e, name_attr) {
        this.$e = $e;
        this.name_attr = name_attr || 'name';
        this.name = $e.attr(this.name_attr);
        this.cache_key = this.pfxMap(this.name);
    };

    FormValSingle.prototype.getVal = function () {
        return this.$e.val();
    };

    FormValSingle.prototype.getAllByName = function () {
        return this.$e.closest('form')
            .find('[' + this.name_attr + '="' + this.name + '"]')
            .not('input:checkbox, input:radio, select[multiple]');
    };

    FormValSingle.prototype.pfxMap = function (x) {
        return 's:' + x;
    }

    Drupal.behaviors.mautic = {};

    Drupal.behaviors.mautic.elementFactory = function ($e, name_attr) {
        name_attr = name_attr || 'data-form-key';
        var type = $e.attr('type');
        if (type === 'checkbox' || type === 'radio' || $e.is('select[multiple]')) {
            return new FormValList($e, name_attr);
        }
        return new FormValSingle($e, name_attr);
    };

    Drupal.behaviors.mautic.formKey = function ($e) {
        var name = $e.attr('name');
        if (!name) {
            return;
        }
        if ($e.attr('type') === 'checkbox') {
            name = name.slice(0, -(2 + $e.attr('value').length));
        }
        return name.slice(name.lastIndexOf('[') + 1, -1);
    };

    Drupal.behaviors.mautic._keys = function (name) {
        if (name in this.settings.map) {
            return this.settings.map[name];
        }
        return [name];
    };

    Drupal.behaviors.mautic.keys = function (val) {
        return $.map(this._keys(val.name), val.pfxMap);
    };

    Drupal.behaviors.mautic.attachToInputs = function ($wrapper) {
        var self = this;
        var $inputs = $wrapper.find('input, select, textarea').not(function (i, element) {
            // Exclude file elements. We can't prefill those.
            if ($(element).attr('type') === 'file') {
                return true;
            }
            // Check nearest include and exclude-wrapper.
            var $exclude = $(element).closest('.mauticform-prefill-exclude');
            var $include = $(element).closest('.mauticform-prefill-include');
            if ($exclude.length > 0) {
                // Exclude unless there is an include-wrapper inside the exclude wrapper.
                return $include.length <= 0 || $.contains($include.get(), $exclude.get());
            }
            return false;
        });

        $inputs.not('[data-form-key]').each(function () {
            var $e = $(this);
            var fk = self.formKey($e);
            if (fk) {
                $e.attr('data-form-key', fk);
            }
        });

        var done = {};
        $inputs.each(function () {
            var e = self.elementFactory($(this));
            if (!(e.cache_key in done)) {
                done[e.cache_key] = true;

                // Get value from all possible keys.
                var value = prefillStore.getFirst(self.keys(e));
                if (value !== null) {
                    e.getAllByName().val(value);
                }
            }
        });

        $inputs.on('change', function () {
            var e = self.elementFactory($(this));
            if (!e.name) {
                return;
            }
            prefillStore.setItem(e.cache_key, e.getVal());
        });
    };

    Drupal.behaviors.mautic.attach = function (context, settings) {
        if (!prefillStore.browserSupport()) {
            return;
        }

        if (typeof this.settings === 'undefined') {
            var hash = window.location.hash.substr(1);
            if (hash) {
                var new_hash = this.readUrlVars(hash);
                if (new_hash !== hash) {
                    window.location.hash = '#' + new_hash;
                }
            }
            if ('mauticform_prefill' in Drupal.settings) {
                this.settings = Drupal.settings.mautic;
            }
            else {
                this.settings = {map: {}};
            }
        }

        this.attachToInputs($('.mauticform_wrapper', context));
    };

    /**
     * Parse the hash from the hash string and clean them from the string.
     *
     * The hash string is first split into parts using a semi-colon";" as a
     * separator. Each part that contains prefill variables (with the "p:"-prefix)
     * is then removed.
     *
     * All prefill-values are stored into the session store.
     */
    Drupal.behaviors.mautic.readUrlVars = function (hash, store) {
        hash = hash || window.location.hash.substr(1);
        if (!hash) {
            return '';
        }
        store = store || prefillStore;
        var vars = {}, key, value, p, parts, new_parts = [];
        parts = hash.split(';');
        for (var j = 0; j < parts.length; j++) {
            var part_has_prefill_vars = false;
            var part = parts[j];
            // Parts starting with p: are used for pre-filling.
            if (part.substr(0, 2) === 'p:') {
                var hashes = part.substr(2).split('&');
                for (var i = 0; i < hashes.length; i++) {
                    p = hashes[i].indexOf('=');
                    key = hashes[i].substring(0, p);
                    // Backwards compatibility strip p: prefixes from keys.
                    if (key.substr(0, 2) === 'p:') {
                        key = key.substr(2);
                    }
                    value = hashes[i].substring(p + 1);
                    // Prepare values to be set as list values.
                    if (!(key in vars)) {
                        vars[key] = [];
                    }
                    vars[key].push(value);
                    // Set string values directly.
                    store.setItem('s:' + key, value);
                }
            }
            else {
                new_parts.push(part);
            }
        }

        // Finally set all list values.
        $.each(vars, function (key, value) {
            store.setItem('l:' + key, value);
        });

        return new_parts.join(';');
    };

}(jQuery));
