;(() => {
    "use strict";

    const SEVERITY_TYPES = [
        '',
        'Warning',
        'Notice',
        'Parse Error',
        'Fatal Error',
        'Exception'
    ];

    /**
     * @param {Function} callback
     */
    function getLogs(callback) {
        fetch("/logs.json")
            .then((response) => {
                return response.json()
            })
            .then((data) => {
                callback(data);
            });
    }

    function simplify(logs) {
        let previousError = '';
        let newLogs = [];
        logs.forEach((log) => {
            if(log['message']['error'] === previousError) {
                previousError = log['message']['error'];
                newLogs[newLogs.length - 1]['count']++;
                return;
            }
            log['count'] = 1;
            previousError = log['message']['error'];
            newLogs.push(log);
        });
        return newLogs;
    }

    function handleLogs(logs) {
        logs.reverse();
        logs = simplify(logs);
        setFirstLog(logs[0]);
        let tabCounter = 0;
        logs.forEach((log, key) => {
            if((key % 30) === 0) {
                let tab = document.createElement('a');
                tab.classList.add("mdc-tab");
                tab.setAttribute('aria-controls', 'panel-' + tabCounter);
                tab.setAttribute('href', '#panel-' + tabCounter);
                tab.innerHTML = "Part " + (tabCounter + 1);
                let tabPanel = document.createElement('ul');
                tabPanel.classList.add("panel");
                tabPanel.classList.add("mdc-list");
                tabPanel.classList.add("mdc-list--two-line");
                tabPanel.setAttribute('id', "panel-" + tabCounter);
                tabPanel.setAttribute('data-panel', tabCounter.toString());
                if(tabCounter === 0) {
                    tab.classList.add("mdc-tab--active");
                    tabPanel.classList.add("active");
                }
                document.querySelector('#dynamic-tab-bar').appendChild(tab);
                document.querySelector('#log-panels').appendChild(tabPanel);
                tabCounter++;
            }
            let panelToTab = document.querySelector("[data-panel='" + (tabCounter - 1) + "']");
            panelToTab.innerHTML += convertToListItem(log, key);

            mdc.autoInit();
        });

        if(tabCounter === 1) {
            // Hide the navbar
            document.querySelector('#dynamic-toolbar').style.display = 'none';
        }

        let dynamicTabBar = window.dynamicTabBar = new mdc.tabs.MDCTabBar(document.querySelector('#dynamic-tab-bar'));

        dynamicTabBar.preventDefaultOnClick = true;

        dynamicTabBar.listen('MDCTabBar:change', function ({detail: tabs}) {
            let nthChildIndex = tabs.activeTabIndex;

            updatePanel(nthChildIndex);
        });

        attachEventHandlers();
    }

    function attachEventHandlers() {
        Array.from(document.querySelectorAll('[data-error-id]')).forEach((listItem) => {
            listItem.addEventListener('click', function (evt) {
                dialog.lastFocusedTarget = evt.target;
                setModalContent(this);
                dialog.show();
            });
        });
    }

    function setNotFoundFile(element, data) {
        let message = data.message;

        element.innerHTML = `
            <section class="not-found mdc-elevation--z7">
                ${message}
            </section>
        `;
    }

    function setFirstLog(log) {
        document.querySelector('#last-error').innerHTML = log['message']['error'];

        let file = log['message']['fileName'];
        let lineNumber = log['message']['lineNumber'];

        let lineInitNumber = lineNumber - 2;

        fetch(`/lines/${file.replace(/\//g, '_')}/${lineNumber - 2}:${lineNumber + 2}`)
            .then(function (data) {
                return data.json();
            }).then(function (json) {
            if(json.code !== 200) {
                if(json.code === 404) {
                    setNotFoundFile(document.querySelector('#last-error-info'), json);
                    return;
                }
                return;
            }
            let fileLines = `
                    <section class="mdc-elevation--z7">
                        <section class="file-name">
                            ${file}
                            <a href="javascript:void(0);" class="file-visibler" data-file-name="${file}">Show whole file</a>
                        </section>
                        <section class="code">
                `;
            json['lines'].forEach((line, key) => {
                let errLine = '';
                if(lineInitNumber === lineNumber) {
                    errLine = 'err-line';
                }
                fileLines += `
                        <code class="line ${errLine}">
                            <span class="line-number">${lineInitNumber}</span>
                            <span class="line-code">${line}</span>
                        </code>
                    `;
                lineInitNumber++;
            });
            fileLines += `
                        </section>
                    </section>
                `;

            let errInfo = `
                    <section class="err-info mdc-elevation--z7">
                        <section class="mdc-typography--title mdc-theme--text-primary-on-dark bold-thick">Full Error:</section>
                        <code class="err-string">${log['originalMessage']}</code>
                        <section class="dates">
                            <section class="mdc-typography--subheading1 mdc-theme--text-primary-on-dark bold">Date and Time:</section>
                            ${log['date']}
                        </section>
                    </section>
                `;
            document.querySelector('#last-error-info').innerHTML = fileLines + '\n' + errInfo;
        });

        setTimeout(() => {
            Array.from(document.querySelectorAll('.file-visibler')).forEach((visibler) => {
                visibler.addEventListener('click', visibleWholeFile);
            });
        }, 500);
    }

    function setModalContent(listItem) {
        let logData = listItem.getAttribute('data-log');
        logData = eval(`(function () { return ${logData}; })();`);
        document.querySelector('.mdc-dialog__header__title').innerHTML = logData['message']['error'];

        let file = logData['message']['fileName'];
        let lineNumber = logData['message']['lineNumber'];

        let lineInitNumber = lineNumber - 2;

        fetch(`/lines/${file.replace(/\//g, '_')}/${lineNumber - 2}:${lineNumber + 2}`)
            .then(function (data) {
                return data.json();
            }).then(function (json) {
            if(json.code !== 200) {
                if(json.code === 404) {
                    setNotFoundFile(document.querySelector('.mdc-dialog__body'), json);
                    return;
                }
                return;
            }
            let fileLines = `
                    <section class="mdc-elevation--z7">
                        <section class="file-name">
                            ${file}
                            <a href="#" class="file-visibler" data-file-name="${file}">Show whole file</a>
                        </section>
                        <section class="code">
                `;
            json['lines'].forEach((line, key) => {
                let errLine = '';
                if(lineInitNumber === lineNumber) {
                    errLine = 'err-line';
                }
                fileLines += `
                        <code class="line ${errLine}">
                            <span class="line-number">${lineInitNumber}</span>
                            <span class="line-code">${line}</span>
                        </code>
                    `;
                lineInitNumber++;
            });
            fileLines += `
                        </section>
                    </section>
                `;

            let errInfo = `
                    <section class="err-info mdc-elevation--z7">
                        <section class="mdc-typography--title mdc-theme--text-primary-on-dark bold-thick">Full Error:</section>
                        <code class="err-string">${logData['originalMessage']}</code>
                        <section class="dates">
                            <section class="mdc-typography--subheading1 mdc-theme--text-primary-on-dark bold">Date and Time:</section>
                            ${logData['date']}
                        </section>
                    </section>
                `;
            document.querySelector('.mdc-dialog__body').innerHTML = fileLines + '\n' + errInfo;
        });

        setTimeout(() => {
            Array.from(document.querySelectorAll('.file-visibler')).forEach((visibler) => {
                visibler.addEventListener('click', visibleWholeFile);
            });
        }, 500);
    }

    function updatePanel(index) {
        let panels = document.querySelector('.panels');
        let activePanel = panels.querySelector('.panel.active');
        if (activePanel) {
            activePanel.classList.remove('active');
        }
        let newActivePanel = panels.querySelector('.panel:nth-child(' + (index + 1) + ')');
        if (newActivePanel) {
            newActivePanel.classList.add('active');
        }
    }

    function visibleWholeFile(ev) {
        ev.preventDefault();
        let fileName = ev.target.getAttribute('data-file-name');
        window.location = '/file#' + encodeURIComponent(fileName.replace(/\//g, '_'));
    }

    function convertToListItem(log, key) {
        let stringLog = JSON.stringify(log);
        let date = log['date'];
        let severity = SEVERITY_TYPES[log['severity']];
        let originalMessage = log['originalMessage'];
        let fileName = log['message']['fileName'];
        let lineNumber = log['message']['lineNumber'];
        let error = log['message']['error'];
        let count = log['count'];
        let count_badge = '';
        if(count > 1) {
            count_badge = `<span class="count-badge">${count}</span>`;
        }
        let error_shortened;
        if(error.length > 70) {
            error_shortened = error.substr(0, 70) + '...';
        } else {
            error_shortened = error;
        }
        let severityIconDisplay = severityIcon(log['severity']);
        return `
        <li class="mdc-list-item" data-log='${stringLog}' data-error-id="${key}" data-mdc-auto-init="MDCRipple">
            ${count_badge}
            <span class="mdc-list-item__start-detail" style="text-align: center" aria-hidden="true">
                <i class=" material-icons error-${log['severity']}">${severityIconDisplay}</i>
                <span class="error-type">${severity.split(' ')[0]}</span>
            </span>
            <span class="mdc-list-item__text">
                <span class="bold">${error_shortened}</span>
                <span class="mdc-list-item__text__secondary">
                    ${date} &middot; ${fileName}
                </span>
            </span>
        </li>
        `;
    }

    function severityIcon(severity) {
        switch (severity) {
            case 1:
                return "error";
                break;
            case 2:
                return "note_add";
                break;
            case 3:
                return "remove_red_eye";
                break;
            case 4:
                return "highlight_off";
                break;
            case 5:
                return "toll";
                break;
        }
    }

    let dialog;

    if(typeof DECLARE_NON_LOAD === 'undefined' || DECLARE_NON_LOAD === false) {
        getLogs(handleLogs);

        dialog = new mdc.dialog.MDCDialog(document.querySelector('#error-dialog'));

        dialog.listen('MDCDialog:accept', function() {
            console.log('accepted');
        });

        dialog.listen('MDCDialog:cancel', function() {
            console.log('canceled');
        });
    }

    class FileViewer {
        /**
         * FileViewer Constructor.
         * @param {String} fileName
         */
        constructor(fileName) {
            this.fileName = fileName;
        }

        fill() {
            fetch(`/getFileContents/${this.fileName.replace(/\//g, '_')}`)
                .then((response) => {return response.text()})
                .then((data) => {FileViewer._fillFile(this.fileName, data)});
        }

        static _fillFile(fileName, file) {
            let fileArr = file.split('\n');
            let container = document.querySelector('[data-file-container]');
            container.innerHTML = `
            <section class="file-name mdc-elevation--z4">
                ${fileName}
                <a class="file-visibler" href="/">Go Back</a>
            </section>
            `;
            let toAppend = `
            <section class="code">
            `;
            fileArr.forEach((line, number) => {
                toAppend += `
                <code class="line">
                    <span class="line-number">${number}</span>
                    <span class="line-code">${line}</span>
                </code>
                `;
            });
            toAppend += `
            </section>
            `;
            container.innerHTML += toAppend;
        }
    }

    window.FileViewer = FileViewer;
})();