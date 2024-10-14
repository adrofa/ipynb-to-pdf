var dropzone = Dropzone()

m.mount(document.querySelector('main'), {
  view: () => [
    // allowed origins
    dropzone.render(),
  ]
})

function createModal() {
  var modal = document.getElementById("myModal");
  modal.style.display = "block";
}

function deleteModal() {
  setTimeout(function () {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
  }, 500)
}

chrome.downloads.onCreated.addListener(function () {
  deleteModal();
})

function Dropzone() {
  var defaults = {
    // storage
    origins: {},
    header: false,
    match: '',
    // UI
    scheme: 'https',
    host: '',
    timeout: null,
    file: true,
    // static
    schemes: ['https', 'http', '*'],
    encodings: {
      'Unicode': ['UTF-8', 'UTF-16LE'],
      'Arabic': ['ISO-8859-6', 'Windows-1256'],
      'Baltic': ['ISO-8859-4', 'ISO-8859-13', 'Windows-1257'],
      'Celtic': ['ISO-8859-14'],
      'Central European': ['ISO-8859-2', 'Windows-1250'],
      'Chinese Simplified': ['GB18030', 'GBK'],
      'Chinese Traditional': ['BIG5'],
      'Cyrillic': ['ISO-8859-5', 'IBM866', 'KOI8-R', 'KOI8-U', 'Windows-1251'],
      'Greek': ['ISO-8859-7', 'Windows-1253'],
      'Hebrew': ['Windows-1255', 'ISO-8859-8', 'ISO-8859-8-I'],
      'Japanese': ['EUC-JP', 'ISO-2022-JP', 'Shift_JIS'],
      'Korean': ['EUC-KR'],
      'Nordic': ['ISO-8859-10'],
      'Romanian': ['ISO-8859-16'],
      'South European': ['ISO-8859-3'],
      'Thai': ['Windows-874'],
      'Turkish': ['Windows-1254'],
      'Vietnamese': ['Windows-1258'],
      'Western': ['ISO-8859-15', 'Windows-1252', 'Macintosh'],
    },
    // chrome
    permissions: {},

    theme: 'github',
    raw: false,
    themes: {
      wide: true,
    },
    _themes: [],
    content: {
      emoji: false,
      scroll: true,
      toc: true,
      mathjax: true,
      autoreload: false,
      mermaid: false,
    },
    compiler: 'marked',
    html: "",
    markdown: '',
    nbjson: '',
    toc: "",
    interval: null,
    ms: 1000,
  }

  var state = defaults

  let mathjaxSettings = `
  // TeX-AMS_HTML
  window.MathJax = {
  tex: {
    inlineMath: [
        ['$', '$'],
        ['\\\\(', '\\\\)'],
      ],
    displayMath: [
        ['$$', '$$'],
        ['\\\\[', '\\\\]'],
      ],
    processEscapes: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined']
  },
  options: {
    enableMenu: false,
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  startup: {
    typeset: false    // disable initial rendering
  },
  loader: {
    load: ['[tex]/noerrors']
  }
};
  // set specific container to render, can be delayed too
  MathJax.Hub.Queue(
    ['Typeset', MathJax.Hub, '_html']
  )
`;

  chrome.extension.isAllowedFileSchemeAccess((isAllowedAccess) => {
    state.file = /Firefox/.test(navigator.userAgent)
      ? true // ff: `Allow access to file URLs` option isn't available
      : isAllowedAccess
    m.redraw()
  })

  chrome.runtime.sendMessage({message: 'options.origins'}, (res) => {
    Object.assign(state, {file: state.file}, res)
    chrome.permissions.getAll(({origins}) => {
      state.permissions = origins.reduce((all, origin) =>
        (all[origin.replace(/(.*)\/\*$/, '$1')] = true, all), {})
      m.redraw()
    });
    void chrome.runtime.lastError;
  })

  var events = {
    file: () => {
      chrome.tabs.create({url: `chrome://extensions/?id=${chrome.runtime.id}`})
    },

    header: (e) => {
      state.header = !state.header
      chrome.runtime.sendMessage({
        message: 'options.header',
        header: state.header,
      }, (res) => {
        void chrome.runtime.lastError;
      })
    },

    origin: {
      scheme: (e) => {
        state.scheme = state.schemes[e.target.selectedIndex]
      },

      host: (e) => {
        state.host = e.target.value.replace(/.*:\/\/([^:/]+).*/i, '$1')
      },

      remove: (origin) => () => {
        chrome.permissions.remove({origins: [`${origin}/*`]}, (removed) => {
          if (removed) {
            chrome.runtime.sendMessage({message: 'origin.remove', origin}, (res) => {
              void chrome.runtime.lastError;
            })
            delete state.origins[origin]
            delete state.permissions[origin]
            m.redraw()
          }
        })
      },

      refresh: (origin) => () => {
        chrome.permissions.request({origins: [`${origin}/*`]}, (granted) => {
          if (granted) {
            state.permissions[origin] = true
            m.redraw()
          }
        })
      },

      match: (origin) => (e) => {
        state.origins[origin].match = e.target.value
        clearTimeout(state.timeout)
        state.timeout = setTimeout(() => {
          var {match, csp, encoding} = state.origins[origin]
          chrome.runtime.sendMessage({
            message: 'origin.update',
            origin,
            options: {match, csp, encoding},
          }, (res) => {
            void chrome.runtime.lastError;
          })
        }, 750)
      },

      csp: (origin) => () => {
        state.origins[origin].csp = !state.origins[origin].csp
        var {match, csp, encoding} = state.origins[origin]
        chrome.runtime.sendMessage({
          message: 'origin.update',
          origin,
          options: {match, csp, encoding},
        }, (res) => {
          void chrome.runtime.lastError;
        })
      },

      encoding: (origin) => (e) => {
        state.origins[origin].encoding = e.target.value
        var {match, csp, encoding} = state.origins[origin]
        chrome.runtime.sendMessage({
          message: 'origin.update',
          origin,
          options: {match, csp, encoding},
        }, (res) => {
          void chrome.runtime.lastError;
        })
      },
    },

    theme: (e) => {
      state.theme = state._themes[e.target.selectedIndex]
      displayFile(fr.result)
    },
  }

  var oncreate = {
    ripple: (vnode) => {
      mdc.ripple.MDCRipple.attachTo(vnode.dom)
    },
    textfield: (vnode) => {
      mdc.textfield.MDCTextField.attachTo(vnode.dom)
    },
  }

  var onupdate = {
    header: (vnode) => {
      if (vnode.dom.classList.contains('is-checked') !== state.header) {
        vnode.dom.classList.toggle('is-checked')
      }
    },
    csp: (origin) => (vnode) => {
      if (vnode.dom.classList.contains('is-checked') !== state.origins[origin].csp) {
        vnode.dom.classList.toggle('is-checked')
      }
    }
  }

  /*
  console.log(document.getElementsByClassName("dropzone"))
  document.getElementsByClassName("dropzone")[0].addEventListener("dragenter", function(e){
    console.log(e)
  })
  document.getElementsByClassName("dropzone")[0].addEventListener("dragleave", function(e){
    console.log(e)
  })
   */

  var render = () =>
    m('div',
      m('.mdc-card#uploadZone',
        m('.mdc-card-wrapper__text-section', {style: "display: flex; flex-wrap: wrap; justify-content: center;"},
          m('.title', 'Convert Your IPYNB to PDF Instantly'),
          m('.second-title', 'Upload your Jupyter Notebook (.ipynb) file to generate a high-quality PDF in just seconds')
        ),
        m('.mdc-card-wrapper__text-section dropzone',
          {
            onchange: dragdrop(this),
            onclick: () => {
              document.getElementById("dropzoneInput").click()
            },
            ondragenter: (e)=>{
              document.getElementsByClassName("dropzone")[0].classList.add('dropzone-Enter');
              document.getElementsByClassName("dropzone")[0].classList.remove('dropzone');
            },
            ondragleave: (e)=>{
              document.getElementsByClassName("dropzone-Enter")[0].classList.add('dropzone');
              document.getElementsByClassName("dropzone-Enter")[0].classList.remove('dropzone-Enter');
            },
            style: "display: flex; flex-wrap: wrap; flex-direction: column; justify-content: center; align-items: center;"
          },
          m('img.uploadIcon', {src: "/dropzone/img/0v4kdrmcdqm1tj7blh.svg", alt: "Upload file"}),
          m('div', {style: "margin-bottom:25px;margin-top:20px"}, 'Select a file or drag and drop here'),
          m('button.mdc-button mdc-button--raised m-button', {
              oncreate: oncreate.ripple,
//              onclick: () => {
//                document.getElementById("dropzoneInput").click()
//              }
            },
            'SELECT FILE'
          ),
          m('input#dropzoneInput[type=file]', {
            style: "display:none",
            onchange: function (e) {
              openFile(e.target.files[0]);
            },
          }),
        ),
      ),
      m('.mdc-card#iframeCard',
        {style: "display:none; height: 85vh"},
        m('.mdc-card__actions', {style: "justify-content: space-between; padding-top:20px; margin-bottom: 20px; margin-left: 10px; margin-right: 10px;"},
          m('div', {style: "display: flex;flex-direction: row;align-items: center;"},
            m('p', {style: "margin: 0px 10px 0px 0px; font-size: 20px; color: #616262"}, 'File content theme:'),
            m('select.m-select', {
                onchange: events.theme
              },
              state._themes.map((theme) =>
                m('option', {selected: state.theme === theme}, theme)
              )
            )
          ),
          m('div',
            m('button.mdc-button mdc-button--raised m-button', {
                oncreate: oncreate.ripple,
                onclick: () => {
                  document.getElementById("dropzoneInput").click()
                },
                style: "margin-right: 25px"
              },
              'UPLOAD ANOTHER FILE'
            ),
            m('button.mdc-button mdc-button--raised m-button-orange', {
                oncreate: oncreate.ripple,
                onclick: () => {
                  createModal();
                  document.querySelector("iframe").contentDocument.querySelector("#hiddenButton").click();
                }
              },
              'CONVERT FILE TO PDF'
            ),
          ),
        ),
        m('.mdc-card-wrapper__text-section',
          {style: "height:100%"},
          m('iframe',
            {
              style: "position: relative;",
              width: "100%",
              height: "100%",
              frameBorder: "0"
            }
          )
        )
      )
    )
  var notReaderFile = null;
  var fr = new FileReader()

  fr.addEventListener('load', () => {
    displayFile(fr.result)
  }, false)

  state._themes = chrome.runtime.getManifest().web_accessible_resources[0].resources
    .filter((file) => file.indexOf('/themes/') === 0)
    .map((file) => file.replace(/\/themes\/(.*)\.css/, '$1'))

  var dragdrop = function (element, options) {
    options = options || {}

    element.addEventListener("dragover", activate)
    //element.addEventListener("dragleave", deactivate)
    element.addEventListener("dragend", deactivate)
    element.addEventListener("drop", deactivate)
    element.addEventListener("drop", update)
    window.addEventListener("blur", deactivate)

    function activate(e) {
      e.preventDefault()
    }

    function deactivate() {
    }

    function update(e) {
      e.preventDefault()
      openFile(e.dataTransfer.files[0])
    }
  }
  var openFile = (file) => {
    if (file) {
      fr.readAsText(file)
      notReaderFile = file;
    }
  }

  let html = "";

  var displayFile = (file) => {
    html = "";
    let iframeCard = document.querySelector("#iframeCard")
    let iframe = document.querySelector("iframe")
    let uploadZone = document.querySelector("#uploadZone")
    html = document.implementation.createHTMLDocument("viewFile")
    var htmlString = mount(file, html)
    m.render(html.body, htmlString)
    iframe.setAttribute('srcdoc', html.documentElement.innerHTML)
    iframeCard.style.display = "flex";
    uploadZone.style.display = "none"
  }

  function mount(file, html) {
    let dom = []
    dom = fillDom(dom, file)
    var view = m('main', {style: "height: 100%;width: 100%;"}, dom[0], m.trust(dom[0].innerHTML))
    return view;
  }

  function fillDom(dom, file) {
    var resultArr = []
    var nbjson = JSON.parse(file)

    let nbHtml = document.implementation.createHTMLDocument("nbHTML")
    var $ = nbHtml.querySelectorAll.bind(nbHtml)

    nbHtml.body.innerHTML = nb.parse(nbjson).render().innerHTML
    state.html = nb.parse(nbjson).render().innerHTML;

    var childNodes = $('#_html').childNodes
    if (childNodes != null) {
      Array.from()
        .filter((node) => /h[1-6]/i.test(node.tagName))
        .forEach((node) => {
          var a = nbHtml.createElement('a')
          a.className = 'anchor'
          a.name = node.id
          a.href = '#' + node.id
          a.innerHTML = '<span class="octicon octicon-link"></span>'
          node.prepend(a)
        })
    }

    dom.push(m("link", {rel: 'stylesheet', type: 'text/css', href: chrome.runtime.getURL('/content/index.css')}))
    if (state.raw) {
      dom.push(m('pre#_markdown', {oncreate: oncreate.markdown}, state.markdown))
      $('body').classList.remove('_toc-left', '_toc-right')
    } else {
      if (state.theme) {
        dom.push(m('link#_theme', {
          rel: 'stylesheet', type: 'text/css',
          href: chrome.runtime.getURL(`/themes/${state.theme}.css`),
        }))
      }
      if (state.html) {
        dom.push(m('#_html', {
            oncreate: oncreate.html,
            class: (/github(-dark)?/.test(state.theme) ? 'markdown-body' : 'markdown-theme') +
              (state.themes.wide ? ' wide-theme' : '')
          },
          m.trust(state.html)
        ))
        if (state.content.mathjax) {
          dom.push(m('script', {type: 'text/x-mathjax-config'}, mathjaxSettings))
          dom.push(m('script', {
            src: chrome.runtime.getURL('/vendor/MathJax-3.2.2.js')
          }))
        }
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/jspdf.umd.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/pdf-lib.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/purify.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/html2canvas.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/canvas2image.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/mdc.min.js')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/mithril.min.js')
        }))
        dom.push(m('link', {
          rel: 'stylesheet',
          type: 'text/css',
          href: chrome.runtime.getURL('/vendor/prism.min.css')
        }))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/vendor/prism.min.js')
        }))
        dom.push(m('button#hiddenButton', {style:"display: none;"}))
        dom.push(m('div#filename', {style: "display: none;"}, notReaderFile.name))
        dom.push(m('script', {
          src: chrome.runtime.getURL('/dropzone/uploadable.js')
        }))
        if (state.content.mermaid) {
          dom.push(m('script', {
            src: chrome.runtime.getURL('/vendor/mermaid.min.js')
          }))
          dom.push(m('script', {type: 'text/javascript'}, `
                ;(() => {
                  var timeout = setInterval(() => {
                    if (!!(window.mermaid && mermaid.init)) {
                      clearInterval(timeout)
                      mermaid.init({}, 'code.language-mmd, code.language-mermaid')
                    }
                  }, 50)
                })()
              `))
        }
      }
    }
    resultArr.push(dom)
    return resultArr
  }

  var scroll = (() => {
    function race(done) {
      Promise.race([
        Promise.all([
          new Promise((resolve) => {
            var diagrams = Array.from(document.querySelectorAll('code.language-mmd, code.language-mermaid'))
            if (!state.content.mermaid || !diagrams.length) {
              resolve()
            } else {
              var timeout = setInterval(() => {
                var svg = Array.from(document.querySelectorAll('code.language-mmd svg, code.language-mermaid svg'))
                if (diagrams.length === svg.length) {
                  clearInterval(timeout)
                  resolve()
                }
              }, 50)
            }
          }),
          new Promise((resolve) => {
            var images = Array.from(document.querySelectorAll('img'))
            if (!images.length) {
              resolve()
            } else {
              var loaded = 0
              images.forEach((img) => {
                img.addEventListener('load', () => {
                  if (++loaded === images.length) {
                    resolve()
                  }
                }, {once: true})
              })
            }
          }),
        ]),
        new Promise((resolve) => setTimeout(resolve, 500))
      ])
        .then(done)
    }

    function debounce(container, done) {
      var listener = /html/i.test(container.nodeName) ? window : container
      var timeout = null
    }

    function listen(container, prefix) {
      var key = prefix + location.origin + location.pathname
      try {
        container.scrollTop = parseInt(localStorage.getItem(key))
        debounce(container, () => {
          localStorage.setItem(key, container.scrollTop)
        })
      } catch (err) {
        chrome.storage.local.get(key, (res) => {
          container.scrollTop = parseInt(res[key])
        })
        debounce(container, () => {
          chrome.storage.local.set({[key]: container.scrollTop})
        })
      }
    }

    return {
      body: () => {
        var loaded
        let nbHtml = document.implementation.createHTMLDocument("nbHTML")
        var $ = nbHtml.querySelectorAll.bind(nbHtml)
        race(() => {
          if (!loaded) {
            loaded = true
            if (state.content.scroll) {
              listen($('html'), 'md-')
            } else if (location.hash && $(location.hash)) {
              $('html').scrollTop = $(location.hash).offsetTop
            }
          }
        })
      },
    }
  })()

  return {state, render}
}
