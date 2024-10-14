let el = document.querySelector("#hiddenButton")
if(el){
  el.addEventListener('click', function(){
    const {jsPDF} = window.jspdf;
    window.scrollTo(0, 0);
    var styles = getComputedStyle(document.querySelector("body"));
    var colorRGBA = styles.background.split(")")[0]+")";
    console.log(colorRGBA);
    var colorHEX = "#"+rgba2hex(colorRGBA);
    console.log(colorHEX);
    html2canvas(document.body, {
        scrollY: -window.scrollY, allowTaint: true,
        useCORS: true,
        backgroundColor: colorHEX
      }).then(function (canvas) {
        var imgData = canvas.toDataURL('image/png');
        var imgWidth = 210;
        var pageHeight = 295;
        var imgHeight = canvas.height * imgWidth / canvas.width;
        var heightLeft = imgHeight;
        var doc = new jsPDF({
          orientation:'p', unit:'mm'
        });
        var position = 10; // give some top padding to first page

        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, null, 'FAST');
        heightLeft -= pageHeight;
        pos2 = 0
        while (heightLeft >= 0) {
          position += heightLeft - imgHeight + pos2;// top padding for other pages
          pos2 += 295
          doc.addPage();
          doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, null, 'FAST');
          heightLeft -= pageHeight;
        }
        var filename = document.querySelector("#filename").textContent.replace('\.ipynb', '');
        console.log(doc.save(filename+'.pdf'));
      })
  })
}

Prism.highlightAll()


function rgba2hex(orig) {
  var a, isPercent,
    rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
    alpha = (rgb && rgb[4] || "").trim(),
    hex = rgb ?
    (rgb[1] | 1 << 8).toString(16).slice(1) +
    (rgb[2] | 1 << 8).toString(16).slice(1) +
    (rgb[3] | 1 << 8).toString(16).slice(1) : orig;

  if (alpha !== "") {
    a = alpha;
  } else {
    a = 01;
  }
  // multiply before convert to HEX
  a = ((a * 255) | 1 << 8).toString(16).slice(1)
  hex = hex + a;

  return hex;
}
