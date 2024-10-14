const { jsPDF } = window.jspdf;

var dropzone = Dropzone()

m.mount(document.querySelector('main'), {
  view: () => [
    // allowed origins
    dropzone.render(),
  ]
})

// ff: set appropriate footer icon
document.querySelector(
  '.icon-' + (/Firefox/.test(navigator.userAgent) ? 'firefox' : 'chrome')
).classList.remove('icon-hidden')

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === 'reload') {
    location.reload(true)
  } else if (req.message === 'theme') {
    state.theme = req.theme
    m.redraw()
  } else if (req.message === 'themes') {
    state.themes = req.themes
    m.redraw()
  } else if (req.message === 'raw') {
    state.raw = req.raw
    m.redraw()
  } else if (req.message === 'autoreload') {
    clearInterval(state.interval)
  }
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
  MathJax.Hub.Config({
    jax: [
      'input/TeX',
      'output/HTML-CSS',
      'output/PreviewHTML',
    ],
    extensions: [
      'tex2jax.js',
      'AssistiveMML.js',
      'a11y/accessibility-menu.js',
    ],
    TeX: {
      extensions: [
        'AMSmath.js',
        'AMSsymbols.js',
        'noErrors.js',
        'noUndefined.js',
      ]
    },
    tex2jax: {
      inlineMath: [
        ['$', '$'],
        ['\\\\(', '\\\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\\\[', '\\\\]'],
      ],
      processEscapes: true
    },
    showMathMenu: false,
    showProcessingMessages: false,
    messageStyle: 'none',
    skipStartupTypeset: true, // disable initial rendering
    positionToHash: false
  })
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
    })
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
            chrome.runtime.sendMessage({message: 'origin.remove', origin})
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
        })
      },

      encoding: (origin) => (e) => {
        state.origins[origin].encoding = e.target.value
        var {match, csp, encoding} = state.origins[origin]
        chrome.runtime.sendMessage({
          message: 'origin.update',
          origin,
          options: {match, csp, encoding},
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

  var render = () =>
    m('div',
      m('.mdc-card#uploadZone',
        m('.mdc-card-wrapper__text-section',
          m('.title', 'Upload File')
        ),
        m('.mdc-card-wrapper__text-section dropzone',
          {
            onchange: dragdrop(this),
            onclick: () => {
              document.getElementById("dropzoneInput").click()
            }
          },
          m('div', 'Drop file here to load content or click on this box to open file'),
          m('img.uploadIcon', {src: "/dropzone/img/upload.svg", alt: "Upload file"}),
          m('input#dropzoneInput[type=file]', {
            style: "display:none",
            onchange: function (e) {
              openFile(e.target.files[0])
            },
          }),
        ),
        m('.mdc-card__actions',
          m('button.mdc-button mdc-button--raised m-button', {
              oncreate: oncreate.ripple,
              onclick: () => {
                document.getElementById("dropzoneInput").click()
              }
            },
            'Upload manually'
          ),
        ),
      ),
      m('.mdc-card#iframeCard',
        {style:"display:none; height: 56em"},
        m('.mdc-card__actions', {style:"justify-content: space-around; padding-top:20px;"},
          m('button.mdc-button mdc-button--raised m-button', {
              oncreate: oncreate.ripple,
              onclick: () => {
                document.getElementById("dropzoneInput").click()
              }
            },
            'Upload other file'
          ),
          m('button.mdc-button mdc-button--raised m-button', {
              oncreate: oncreate.ripple,
              onclick:  () => {
                let opt = {
                  allowTaint: true,
                  taintTest: false,
                  backgroundColor: 'rgba(0, 200, 0, 1)',
                  scrollX: -document.querySelector("iframe").contentWindow.screenX, scrollY: document.querySelector("iframe").contentWindow.screenY
                }
                let doc = new jsPDF()
                doc.html(document.querySelector("iframe"), {
                  callback:function(doc){
                    doc.save()
                  }
                })
//                html2canvas(document.querySelector("iframe")).then(function(canvas){
//                  canvas.width = document.querySelector("iframe").contentDocument.body.scrollWidth
//                  canvas.height = document.querySelector("iframe").contentDocument.body.scrollHeight
//                  var gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
//                  var img = canvas.toDataURL("image/jpeg")
//                  document.querySelector("iframe").setAttribute("src", img)
//                  document.querySelector("iframe").removeAttribute("srcdoc")
//                  let doc = new jsPDF()
//                    doc.addImage(img, 'JPEG', 15, 40, 180, 180)
//                  doc.save()
//                })
              }
            },
            'Download PDF'
          ),
          m('div', {style: "display: flex;flex-direction: column;align-items: center; margin-bottom:20px;"},
            m('h3', {style:"margin: 0"}, 'Select Theme'),
            m('select.mdc-elevation--z2 m-select', {
                onchange: events.theme
                },
                state._themes.map((theme) =>
                  m('option', {selected: state.theme === theme}, theme)
                )
              )
          )
        ),
        m('.mdc-card-wrapper__text-section',
          {style:"height:100%"},
          m('iframe',
            {
              style: "position: relative;",
              width: "100%",
              height: "100%"
            }
          )
        )
      )
    )

  var fr = new FileReader()

  fr.addEventListener('load', () => {
    displayFile(fr.result)
  }, false)

  state._themes = chrome.runtime.getManifest().web_accessible_resources
    .filter((file) => file.indexOf('/themes/') === 0)
    .map((file) => file.replace(/\/themes\/(.*)\.css/, '$1'))

  var dragdrop = function (element, options) {
    options = options || {}

    element.addEventListener("dragover", activate)
    element.addEventListener("dragleave", deactivate)
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
    console.log(state)
  }

  function mount(file, html) {
    let dom = []
    dom = fillDom(dom, file)
    var view = m('main', {style: "height: 100%;width: 100%;"}, dom[1], m.trust(dom[1].innerHTML))
    return view;
  }

  function fillDom(dom, file) {
    var resultArr = []
    var nbjson = JSON.parse(file)
    let nbHtml = document.implementation.createHTMLDocument("nbHTML")
    nbHtml.body.innerHTML = nb.parse(nbjson).render().innerHTML
    state.html = nbHtml.body.innerHTML
    resultArr.push(nb.parse(nbjson).render())

    var toc = (
        link = (header) => '<a href="#' + header.id + '">' + header.title + '</a>') =>
        Array.from(nbHtml.querySelectorAll("h1, h2, h3, h4, h5, h6"))
          .filter((node) => /h[1-6]/i.test(node.tagName))
          .map((node) => ({
            id: node.getAttribute('id'),
            level: parseInt(node.tagName.replace('H', '')),
            title: node.innerText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          }))
          .reduce((html, header) => {
            html += '<div class="_ul">'.repeat(header.level)
            html += link(header)
            html += '</div>'.repeat(header.level)
            return html
          }, '')
    state.toc = toc()
    var $ = nbHtml.querySelectorAll.bind(nbHtml)
    var childNodes = $('#_html').childNodes
    if(childNodes!=null){
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
//        if (state.content.toc && state.toc) {
//          dom.push(m('#_toc', {oncreate: oncreate.toc},
//            m.trust(state.toc)
//          ))
//          nbHtml.querySelector('body').classList.add('_toc-left')
//        }
        if (state.content.mathjax) {
          dom.push(m('script', {type: 'text/x-mathjax-config'}, mathjaxSettings))
          dom.push(m('script', {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js'
          }))
        }
        if (state.content.mermaid) {
          dom.push(m('script', {
            src: 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/8.8.4/mermaid.min.js'
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

  return {state, render}
}
