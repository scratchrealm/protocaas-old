import h5py
import pynwb
import protocaas.client as prc
import remfile

# Load project test slurm compute resource
project = prc.load_project('bcv4jauf')

# Lazy load 000618/sub-paired-english/sub-paired-english_ses-paired-english-m108-191125-163508_ecephys.nwb
nwb_file = project.get_file('000618/sub-paired-english/sub-paired-english_ses-paired-english-m108-191125-163508_ecephys.nwb')
nwb_url = nwb_file.get_url()
nwb_remf = remfile.File(nwb_url)
io = pynwb.NWBHDF5IO(file=h5py.File(nwb_remf, 'r'), mode='r')
nwb = io.read()

# Explore the NWB file
print(nwb)