/*jshint globalstrict: true*/
"use strict";

var settings = {};

var relay_symbols = {
    off: "☒", // "⚪",
    on: "☑", // "⚫",
    toggle: "⟳", //"♺",
    untouched: "☐"
};

var key_event_symbols = {
    pressed: "↓",
    released: "↑"
};

var event_type_dict = {};
event_type_dict[0] = key_event_symbols.pressed;
event_type_dict[1] = key_event_symbols.released;

var relay_actuation_dict = {}; // IDs must match to the ones in the C++ implementation (see RelayTypes.h)
relay_actuation_dict[0] = {id: 0, symbol: relay_symbols.off, alt: "deactivate"};
relay_actuation_dict[1] = {id: 1, symbol: relay_symbols.on, alt: "activate"};
relay_actuation_dict[2] = {id: 2, symbol: relay_symbols.toggle, alt: "toggle"};
relay_actuation_dict[3] = {id: 3, symbol: relay_symbols.untouched, alt: "leave untouched"};

// ---------------------------------------------------------------------------------------------------------------------

function forEachRelaySetting(callback) {
    var path = "";
    var keys_actions = settings["ka"];
    for (var key_code in keys_actions) {
        path += key_code;
        var key_event_types = keys_actions[key_code];

        for (var key_event_type_id in key_event_types) {
            path += "." + key_event_type_id;
            var relay_states = key_event_types[key_event_type_id];

            for (var relay_id in relay_states) {
                path += "." + relay_id;
                var relay_state = relay_states[relay_id];

                callback(path + "." + relay_state);

                path = path.slice(0, path.lastIndexOf("."));
            }
            path = path.slice(0, path.lastIndexOf("."));
        }
        path = "";
    }
}

function loadTableFromSettings() {

    console.log("loadTableFromSettings");

    function setRadiobuttonEnabled(id) {
        var r = document.getElementById(id);
        r.checked = true;
    }

    forEachRelaySetting(setRadiobuttonEnabled);

    // load key names
    for (var key_name_idx in settings["names"]["k"]) {
        var c = document.getElementById(key_name_idx + ".key_name");
        c.innerHTML = settings["names"]["k"][key_name_idx] + " (" + key_name_idx + ")";
    }

    // load relay names
    for (var relay_name_idx in settings["names"]["r"]) {
        var c = document.getElementById("thd." + relay_name_idx);
        c.innerHTML = settings["names"]["r"][relay_name_idx] + " (" + relay_name_idx + ")";
    }
}

function setRelayTableValues(key_code, event_type, relay_id, actuation_value) {
    var row_class = "";
    if (key_code != -1)
        row_class = " key_code" + key_code;

    var event_class = "";
    if (event_type != -1)
        event_class = " event_type" + event_type;

    var col_class = "";
    if (relay_id != -1)
        col_class = " relay_id" + relay_id;

    var classes = row_class + col_class + " " + event_class + " value" + actuation_value;
    var buttons = document.getElementsByClassName(classes);

    for (var button_idx in buttons) {
        // update table
        var button = buttons[button_idx];
        button.checked = true;
        // update matrix
        saveRelayValueByRadioIdToMatrix(button.id, button.value);
    }
}

function saveRelayValueByRadioIdToMatrix(path, value) {
    //var [key_code, event_type, relay_id] = path.split(".");
    var args = path.split(".");
    var key_code = args[0];
    var event_type = args[1];
    var relay_id = args[2];
    var keys_actions = settings["ka"];

    clearSavedStateIndicator();
    keys_actions[key_code][event_type][relay_id] = parseInt(value); // saves " in Json and thus memory while parsing
}

// ---------------------------------------------------------------------------------------------------------------------

function saveSettingsToDevice() {
    console.log("save relayboardsettings: " + settings);
    sendJson("/api/relayboardsettings/relay/save", settings, function (response) {
        var status_field = document.getElementById("save_status");
        var response_object = JSON.parse(response);
        if (response_object["return"] == true || response_object["return"] == "true") {
            status_field.innerHTML = "saved";
        } else {
            status_field.innerHTML = response_object["reason"];
        }
    });
}

function clearSavedStateIndicator() {
    var status_field = document.getElementById("save_status");
    status_field.innerHTML = "";
}

function setUnsavedStateIndicator() {
    var status_field = document.getElementById("save_status");
    status_field.innerHTML = "!";
    status_field.setAttribute("alt", "unsaved changes");
}

function addSaveButton(node, text, alternative_text) {
    if (text == null) text = "💾";
    if (alternative_text == null) alternative_text = "save relayboardsettings";
    var button = node.appendChild(document.createElement("button"));

    button.setAttribute("type", "button");
    button.setAttribute("onClick", "saveSettingsToDevice();");
    button.innerHTML = text;
    button.setAttribute("alt", alternative_text);
}

// ---------------------------------------------------------------------------------------------------------------------

function addShortcutButton(node, text, row, column, event_type, value, alternative_text) {
    var button = node.appendChild(document.createElement("button"));
    button.setAttribute("type", "button");
    button.setAttribute("onClick", "setRelayTableValues(" +
        row + "," +
        event_type + "," +
        column + "," +
        value + ");");
    button.innerHTML = text;
    button.setAttribute("alt", alternative_text);
}

// ---------------------------------------------------------------------------------------------------------------------

function createTableLegend(id) {
    var r = relay_symbols;
    var k = key_event_symbols;

    var legend =
        r.on + " ... On <br />" +
        r.off + " ... Off <br />" +
        r.toggle + " ... Toggle <br />" +
        r.untouched + " ... Unchanged <br />" +
        "<br />" +
        k.pressed + " ... Button Pressed <br />" +
        k.released + " ... Button Released <br />";

    var root = document.getElementById(id);
    root.innerHTML = legend;
}

// ---------------------------------------------------------------------------------------------------------------------

function createTableFromSettings(id) {
    var root = document.getElementById(id);

    var table = root.appendChild(document.createElement("table"));
    table.setAttribute("border", "1");

    { // table header
        var table_header = table.appendChild(document.createElement("thead"));
        var thd = table_header.appendChild(document.createElement("td"));
        thd.innerHTML = "Key #";
        thd = table_header.appendChild(document.createElement("td"));
        thd.innerHTML = "Event";

        var keys_actions = settings["ka"];
        for (var idx in keys_actions[0][0]) {
            thd = table_header.appendChild(document.createElement("td"));
            thd.setAttribute("id", "thd." + idx);
            //thd.innerHTML = relayboardsettings["names"]["r"][idx] + "(Relay " + idx + ")";
        }

        // add save button and status div
        thd = table_header.appendChild(document.createElement("td"));
        addSaveButton(thd);
        var save_status = thd.appendChild(document.createElement("div"));
        save_status.setAttribute("id", "save_status");
    }

    var table_body = table.appendChild(document.createElement("tbody"));
    table_body.setAttribute("align", "center");

    { // column shortcuts
        var shortcuts = table_body.appendChild(document.createElement("tr"));
        var ths = shortcuts.appendChild(document.createElement("td"));
        ths.innerHTML = "";
        ths.setAttribute("colspan", "2");

        var keys_actions = settings["ka"];
        for (var id in keys_actions[0][0]) {
            ths = shortcuts.appendChild(document.createElement("td"));
            for (var idx in relay_actuation_dict) {
                var attrs = relay_actuation_dict[idx];
                addShortcutButton(ths, attrs.symbol, -1, id, -1, attrs.id, attrs.alt);
            }
        }

        // table shortcuts
        ths = shortcuts.appendChild(document.createElement("td"));
        for (var idx in relay_actuation_dict) {
            var attrs = relay_actuation_dict[idx];
            addShortcutButton(ths, attrs.symbol, -1, -1, -1, attrs.id, attrs.alt);
        }
    }
    //{ // table body
    var path = "";
    var keys_actions = settings["ka"];
    for (var key_code in keys_actions) { // for each key
        path += key_code;
        var key_event_types = keys_actions[key_code];
        var class_keycode = "key_code" + key_code;

        var table_row = table_body.appendChild(document.createElement("tr"));

        table_row.setAttribute("id", path);
        var key_name = table_row.appendChild(document.createElement("td"));
        key_name.setAttribute("id", path + ".key_name");
        key_name.setAttribute("rowspan", "2");
        //key_name.innerHTML = relayboardsettings["names"]["k"][key_code] + "(" + key_code + ")";

        var key_event_type_count = 0;
        for (var key_event_type_id in key_event_types) { // for each key event type (pressed, released)
            path += "." + key_event_type_id;
            var relay_states = key_event_types[key_event_type_id];
            var class_event_type = "event_type" + key_event_type_id;

            key_event_type_count += 1;
            if (key_event_type_count >= 2) { // for rowspan
                table_row = table_body.appendChild(document.createElement("tr"));
            }

            var state = table_row.appendChild(document.createElement("td"));
            state.innerHTML = event_type_dict[key_event_type_id];

            for (var relay_id in relay_states) { // for each relay
                path += "." + relay_id;
                var class_relay_id = "relay_id" + relay_id;

                var relay = table_row.appendChild(document.createElement("td"));
                relay.setAttribute("id", path);

                // create radio buttons
                for (var json_action_id in relay_actuation_dict) {
                    var input_attrs = relay_actuation_dict[json_action_id];
                    relay.appendChild(document.createTextNode(input_attrs.symbol));
                    var input = relay.appendChild(document.createElement("input"));
                    input.setAttribute("type", "radio");
                    input.setAttribute("alt", input_attrs.alt);
                    input.setAttribute("name", path);
                    input.setAttribute("id", path + "." + input_attrs.id);
                    input.setAttribute("value", /*path + "." +*/ input_attrs.id);
                    input.setAttribute("class", class_keycode + " " + class_event_type + " " + class_relay_id + " value" + input_attrs.id);
                    input.setAttribute("onClick", "saveRelayValueByRadioIdToMatrix(\"" + path + "\", " + input_attrs.id + ");");
                }
                path = path.slice(0, path.lastIndexOf("."));
            }

            { // add row shortcut buttons
                var shortcuts = table_row.appendChild(document.createElement("td"));

                for (var idx in relay_actuation_dict) {
                    var attrs = relay_actuation_dict[idx];
                    addShortcutButton(shortcuts, attrs.symbol, key_code, -1, key_event_type_id, attrs.id, attrs.alt);
                }
            }

            path = path.slice(0, path.lastIndexOf("."));
        }
        path = "";
    }
    //}
}

/*
function updateSettingsFromTableData() {
    function write_to_json(id) {
        id = id.slice(0, id.lastIndexOf("."));
        var relay_setting = document.querySelector("input[name='" + id + "']:checked");

        var key = id.slice(0, id.indexOf("."));
        id = id.slice(id.indexOf(".") + 1);

        var event = id.slice(0, id.indexOf("."));
        id = id.slice(id.indexOf(".") + 1);

        var relay = id;
        var value = relay_setting.value;

        console.log("relayboardsettings[\"ka\"][" + key + "][" + event + "][" + relay + "]=" + value);
        var keys_actions = relayboardsettings["ka"];
        keys_actions[key][event][relay] = parseInt(value);
    }

    forEachRelaySetting(write_to_json);
}
*/

// ---------------------------------------------------------------------------------------------------------------------

function loadJson(url, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', url, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(this.responseText);
        }
    };
    xobj.send(null);
}

function sendJson(url, json, callback) {
    var xobj = new XMLHttpRequest();
    xobj.open("POST", url, true);
    xobj.setRequestHeader("Content-Type", "application/json");
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == 200) {
            callback(this.responseText);
        }
    };
    xobj.send(JSON.stringify(json));
}

// ---------------------------------------------------------------------------------------------------------------------

function createNamesListingFromSettings(id, type) {
    console.log("createNamesListingFromSettings " + id + " " + type);

    if (type != "k" && type != "r") { // (k) key or (r) relay
        console.log("unsupported type: " + type);
        return;
    }

    var root = document.getElementById(id);
    var key_names = settings["names"][type];

    var type_name = "Key";
    if (type == "r") type_name = "Relay";

    for (var name_idx in key_names) {
        var name = key_names[name_idx];

        root.appendChild(document.createTextNode(type_name + " " + name_idx + " = "));

        var name_input = root.appendChild(document.createElement("input"));
        name_input.setAttribute("type", "text");
        var id = "names." + type + "." + name_idx;
        name_input.setAttribute("id", id);
        name_input.setAttribute("onfocusout", "saveNameToSettings(\"" + id + "\"); loadTableFromSettings(); loadPersistenceEnabledFromSettings();")

        root.appendChild(document.createElement("br"));
    }
}

function loadNamesListingsFromSettings() {
    loadNamesListingFromSettings("k");
    loadNamesListingFromSettings("r");
}

function loadNamesListingFromSettings(type) {
    console.log("loadNamesListingFromSettings " + type);

    if (type != "k" && type != "r") { // (k) key or (r) relay
        console.log("unsupported type: " + type);
        return;
    }

    var names = settings["names"][type];
    var id_prefix = "names." + type + ".";

    for (var name_idx in names) {
        var name = names[name_idx];
        var input = document.getElementById(id_prefix + name_idx);
        input.value = name;
    }
}

function saveNameToSettings(id) {
    console.log("saveNameToSettings " + id);
    var args = id.split(".");
    var names = args[0];
    var type = args[1];
    var name_idx = args[2];
    var name_input = document.getElementById(id);

    clearSavedStateIndicator();
    console.log("old: " + settings[names][type][name_idx] + " new: " + name_input.value);

    settings[names][type][name_idx] = name_input.value;
}

// ---------------------------------------------------------------------------------------------------------------------

function createPersistenceEnabledFromSettings(id) {
    var root = document.getElementById(id);

    { // persistence enabled/disabled state
        root.appendChild(document.createTextNode("Enable persistence: "));

        var persistence_enabled_input = root.appendChild(document.createElement("input"));
        persistence_enabled_input.setAttribute("type", "checkbox");
        persistence_enabled_input.setAttribute("id", "persistence.enabled");
        persistence_enabled_input.setAttribute("onclick", "savePersistenceFlagsToSettings();");

        root.appendChild(document.createElement("br"));
    }

    { // default relays boot state table
        var table = root.appendChild(document.createElement("table"));
        var thead = table.appendChild(document.createElement("thead"));

        for (var relay_id in settings["names"]["r"]) {
            var name = settings["names"]["r"][relay_id];
            var td = thead.appendChild(document.createElement("td"));
            td.setAttribute("id", "persistence.name." + relay_id)
            //td.appendChild(document.createTextNode(name + " (" + relay_id + ")"));
        }

        var tbody = table.appendChild(document.createElement("tbody"));
        var tr = tbody.appendChild(document.createElement("tr"));

        for (var relay_id in settings["names"]["r"]) {
            var td = tr.appendChild(document.createElement("td"));

            var relay_default_input = td.appendChild(document.createElement("input"));
            relay_default_input.setAttribute("type", "checkbox");
            relay_default_input.setAttribute("id", "persistence.flags." + relay_id);
            relay_default_input.setAttribute("onclick", "savePersistenceFlagsToSettings();");
        }
    }
}

function loadPersistenceEnabledFromSettings() {
    console.log("loadPersistenceEnabledFromSettings");

    var persistence_enabled_input = document.getElementById("persistence.enabled");
    persistence_enabled_input.checked = settings["persist"];

    for (var relay_id in settings["names"]["r"]) {
        var name = settings["names"]["r"][relay_id];
        var mask = 1 << relay_id;
        var relay_default_input = document.getElementById("persistence.flags." + relay_id);

        var thd = document.getElementById("persistence.name." + relay_id);
        thd.innerHTML = name + " (" + relay_id + ")";

        if (0 != settings["saved_state"] & mask) {
            relay_default_input.checked = true;
        } else {
            relay_default_input.checked = false;
        }
    }
}

function savePersistenceFlagsToSettings() {
    console.log("savePersistenceEnabledToSettings");
    var persistence_enabled_input = document.getElementById("persistence.enabled");
    clearSavedStateIndicator();

    settings["persist"] = persistence_enabled_input.checked;

    for (var relay_id in settings["names"]["r"]) {
        var mask = 1 << relay_id;
        var relay_default_input = document.getElementById("persistence.flags." + relay_id);

        if (true == relay_default_input.checked) {
            settings["saved_state"] = settings["saved_state"] | mask;
        } else {
            settings["saved_state"] = settings["saved_state"] & ~mask;
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
