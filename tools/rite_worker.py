#!/usr/bin/env python3
"""Moteur RITE : garde LibreOffice et le fichier RITE (Cerema) ouverts, et recalcule à la demande.

Protocole (une ligne JSON par requête sur l'entrée standard, une ligne JSON par réponse) :
  {"id": 1, "cases": [{"Général!C11": 75, "Méthode simplifiée!C27": "Nord"}, ...]}
  -> {"id": 1, "results": [{"dh": 439.1, "jour": 470.9, "nuit": 229.8}, ...]}
Chaque cas part de l'état d'origine du fichier : les cellules modifiées sont remises à leur valeur après calcul.
Outil RITE : Cerema, utilisation libre de droits sous réserve de citer le Cerema.
"""
import json, os, subprocess, sys, time, uuid

RITE_FILE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'vendor', 'rite', 'RITE_V24.2.xlsm'))
OUTPUTS = {'dh': ('Méthode simplifiée', 'A8'), 'jour': ('calculs', 'BN6'), 'nuit': ('calculs', 'BN8')}

import uno
from com.sun.star.beans import PropertyValue


def prop(name, value):
    p = PropertyValue(); p.Name = name; p.Value = value; return p


def start_office():
    pipe = 'rite_' + uuid.uuid4().hex[:8]
    profile = '/tmp/rite_lo_profile_' + pipe
    proc = subprocess.Popen(['soffice', '--headless', '--invisible', '--nologo', '--norestore', '--nodefault',
                             f'-env:UserInstallation=file://{profile}', f'--accept=pipe,name={pipe};urp;'],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver', local)
    for _ in range(120):
        try:
            ctx = resolver.resolve(f'uno:pipe,name={pipe};urp;StarOffice.ComponentContext')
            return proc, ctx
        except Exception:
            time.sleep(0.25)
    raise RuntimeError('LibreOffice ne démarre pas')


def main():
    proc, ctx = start_office()
    desktop = ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)
    doc = desktop.loadComponentFromURL(uno.systemPathToFileUrl(RITE_FILE), '_blank', 0,
                                       (prop('Hidden', True), prop('MacroExecutionMode', 0), prop('ReadOnly', True)))
    doc.calculateAll()
    sheets = doc.Sheets

    def cell(ref):
        sh, addr = ref.split('!')
        return sheets.getByName(sh).getCellRangeByName(addr.split(':')[0])

    def read():
        return {k: round(sheets.getByName(s).getCellRangeByName(a).getValue(), 1) for k, (s, a) in OUTPUTS.items()}

    print(json.dumps({'ready': True, 'base': read()}), flush=True)
    for line in sys.stdin:
        try:
            req = json.loads(line)
            results = []
            for case in req.get('cases', []):
                saved = []
                for ref, value in case.items():
                    c = cell(ref)
                    saved.append((c, c.getFormula()))
                    if isinstance(value, (int, float)): c.setValue(value)
                    else: c.setString(str(value))
                doc.calculateAll()
                results.append(read())
                for c, f in saved: c.setFormula(f)
            print(json.dumps({'id': req.get('id'), 'results': results}), flush=True)
        except Exception as e:
            print(json.dumps({'id': req.get('id') if isinstance(req, dict) else None, 'error': str(e)}), flush=True)
    doc.close(True)
    proc.terminate()


if __name__ == '__main__':
    main()
