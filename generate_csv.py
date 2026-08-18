import pandas as pd

# Lista para capturar todos los DataFrames creados durante la ejecución
captured_dfs = []

# Guardamos el constructor original de pandas
original_init = pd.DataFrame.__init__

# Parcheamos el constructor para interceptar cualquier DataFrame
def patched_init(self, *args, **kwargs):
    original_init(self, *args, **kwargs)
    captured_dfs.append(self)

pd.DataFrame.__init__ = patched_init

# Entorno de ejecución simulando ejecución directa
loc = {
    '__file__': 'test_mapeo_aislado.py',
    '__name__': '__main__'
}

try:
    with open('test_mapeo_aislado.py', 'r', encoding='utf-8') as f:
        exec(f.read(), loc)
except Exception as e:
    # Ignoramos cualquier corte o desconexión al final del script de pruebas
    pass

# Buscamos el DataFrame original en español (tiene 19 columnas y NO tiene "tenure")
raw_spanish_df = None
for df in captured_dfs:
    if len(df.columns) == 19 and 'tenure' not in df.columns:
        raw_spanish_df = df
        break

if raw_spanish_df is not None:
    raw_spanish_df.to_csv('gimnasio_test.csv', index=False)
    print("\n¡Excelente! Archivo 'gimnasio_test.csv' generado con éxito en la raíz.")
else:
    print("\nNo se pudo detectar el DataFrame original en español de 19 columnas.")
