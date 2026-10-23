"""Plot an anonymous coefficient audit; requires optional matplotlib."""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    options=parser.parse_args()
    if options.out.exists():parser.error('Preserve existing figures; choose a new --out')
    report=json.loads(options.report.read_text())
    if report.get('kind')!='polyphase_coefficient_response_audit':parser.error('Expected coefficient audit JSON')
    fig,axes=plt.subplots(2,2,figsize=(11,7),sharex=True,sharey=True)
    colors={'pole14_fs12000_poly33':'#116d79','pole14_fs12000_poly49':'#d26b20',
            'pole14_fs12000_poly_adaptive':'#7548a8'}
    for ax,rate in zip(axes.flat,(16000,44100,48000,96000)):
        cases=[case for case in report['cases'] if case['input_rate_hz']==rate]
        for case in cases:
            color=colors[case['variant']]
            label='Rate-scaled FIR' if case['variant'].endswith('adaptive') else f"{case['taps']} taps"
            # Do not interpolate lines across the unsampled transition band.
            for low,high in ((0,4500),(6500,rate/2)):
                points=[row for row in case['curve'] if low<=row['frequency_hz']<=high]
                x=[row['frequency_hz']/1000 for row in points]
                lower=[row['reachable_min_db'] for row in points]
                upper=[row['reachable_max_db'] for row in points]
                ax.plot(x,upper,color=color,label=label if low==0 else None)
                ax.fill_between(x,lower,upper,color=color,alpha=.2)
        phases=len(cases[0]['reachable_phase_indices'])
        adaptive=next((case for case in cases if case['variant'].endswith('adaptive')),None)
        title=f'{rate/1000:g} kHz input → 12 kHz; {phases} used phase(s)'
        if adaptive:title+=f"\nRate-scaled FIR: {adaptive['taps']} taps"
        ax.set_title(title,fontsize=11)
        ax.axvspan(4.5,6.5,color='#ddd',alpha=.4)
        ax.hlines([-1,1],.25,4.5,color='#555',linestyles='dotted',linewidth=1)
        nyquist_khz=rate/2000
        ax.hlines(-20,6.5,min(10,nyquist_khz),color='#555',linestyles='dashed',linewidth=1)
        if nyquist_khz<10:
            ax.axvspan(nyquist_khz,10,facecolor='none',edgecolor='#bbb',hatch='///',linewidth=0)
        ax.set_xlim(0,10);ax.set_ylim(-80,3);ax.grid(alpha=.15)
        ax.set_xlabel('Input frequency (kHz)');ax.set_ylabel('Coefficient gain (dB)')
    axes[0,0].legend(loc='lower left')
    fig.suptitle('Sampled FIR response across microphone sample rates',fontsize=14)
    fig.text(.5,.015,'Actual coefficients, reachable-phase envelopes; 0–10 kHz view.\n'
             'Grey: unsampled transition. Hatched: above input Nyquist; no audit data or budget.\n'
             'Excludes boundaries, detrending, pre-emphasis, LPC and devices; full sampled response in JSON.',
             ha='center',fontsize=9)
    fig.tight_layout(rect=(0,.10,1,.95))
    options.out.parent.mkdir(parents=True,exist_ok=True)
    with options.out.open('xb') as stream:fig.savefig(stream,format=options.out.suffix[1:],dpi=160)
    plt.close(fig)


if __name__=='__main__':main()
