import openpyxl, subprocess, sys, os, json, shutil, tempfile, warnings
warnings.filterwarnings('ignore')
SRC = sys.argv[1]
cases = json.loads(sys.argv[2])
out = {}
tmp = tempfile.mkdtemp()
for name, changes in cases.items():
    wb = openpyxl.load_workbook(SRC, keep_vba=False)
    for ref, v in changes.items():
        sh, cell = ref.split('!')
        wb[sh][cell] = v
    p = os.path.join(tmp, name + '.xlsx'); wb.save(p)
    subprocess.run(['soffice', '--headless', '--calc', '--convert-to', 'xlsx:Calc MS Excel 2007 XML', '--outdir', os.path.join(tmp, 'o'), p], check=True, capture_output=True, timeout=180)
    r = openpyxl.load_workbook(os.path.join(tmp, 'o', name + '.xlsx'), data_only=True)
    out[name] = {k: r[k.split('!')[0]][k.split('!')[1]].value for k in ['Méthode simplifiée!A8', 'calculs!BN6', 'calculs!BN8']}
print(json.dumps(out, ensure_ascii=False, indent=1))
